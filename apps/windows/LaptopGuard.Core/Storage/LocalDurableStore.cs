using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using LaptopGuard.Core.Models;
using LaptopGuard.Core.Security;

namespace LaptopGuard.Core.Storage
{
    public class LocalDurableStore : IDisposable
    {
        private readonly string _connectionString;
        private readonly string _dbPath;
        private bool _isInitialized = false;
        private readonly object _lock = new();

        public LocalDurableStore(string? customDbPath = null)
        {
            if (string.IsNullOrEmpty(customDbPath))
            {
                string baseDir = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
                    "LaptopGuard"
                );
                Directory.CreateDirectory(baseDir);
                _dbPath = Path.Combine(baseDir, "sentinel.db");
            }
            else
            {
                _dbPath = customDbPath;
                string? dir = Path.GetDirectoryName(_dbPath);
                if (!string.IsNullOrEmpty(dir))
                {
                    Directory.CreateDirectory(dir);
                }
            }

            _connectionString = new SqliteConnectionStringBuilder
            {
                DataSource = _dbPath,
                Mode = SqliteOpenMode.ReadWriteCreate,
                Cache = SqliteCacheMode.Shared
            }.ToString();
        }

        public async Task InitializeAsync()
        {
            if (_isInitialized) return;

            using var connection = new SqliteConnection(_connectionString);
            await connection.OpenAsync();

            // Configure SQLite for high performance and durability
            using var pragmaCmd = connection.CreateCommand();
            pragmaCmd.CommandText = @"
                PRAGMA journal_mode = WAL;
                PRAGMA synchronous = NORMAL;
                PRAGMA busy_timeout = 5000;
            ";
            await pragmaCmd.ExecuteNonQueryAsync();

            // Create tables
            using var tableCmd = connection.CreateCommand();
            tableCmd.CommandText = @"
                CREATE TABLE IF NOT EXISTS incidents (
                    id TEXT PRIMARY KEY,
                    device_id TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    details_json TEXT DEFAULT '{}',
                    synced_to_cloud INTEGER DEFAULT 0
                );

                CREATE TABLE IF NOT EXISTS device_config (
                    key TEXT PRIMARY KEY,
                    value_encrypted TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS audit_logs (
                    id TEXT PRIMARY KEY,
                    action TEXT NOT NULL,
                    details TEXT NOT NULL,
                    timestamp TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_incidents_synced ON incidents(synced_to_cloud);
                CREATE INDEX IF NOT EXISTS idx_incidents_timestamp ON incidents(timestamp DESC);
            ";
            await tableCmd.ExecuteNonQueryAsync();
            _isInitialized = true;
        }

        public async Task SaveIncidentAsync(SecurityIncident incident)
        {
            await InitializeAsync();
            using var connection = new SqliteConnection(_connectionString);
            await connection.OpenAsync();

            using var cmd = connection.CreateCommand();
            cmd.CommandText = @"
                INSERT OR REPLACE INTO incidents 
                (id, device_id, event_type, severity, title, description, timestamp, details_json, synced_to_cloud)
                VALUES ($id, $deviceId, $eventType, $severity, $title, $description, $timestamp, $detailsJson, $synced);
            ";
            cmd.Parameters.AddWithValue("$id", incident.Id);
            cmd.Parameters.AddWithValue("$deviceId", incident.DeviceId);
            cmd.Parameters.AddWithValue("$eventType", incident.EventType);
            cmd.Parameters.AddWithValue("$severity", incident.Severity.ToString());
            cmd.Parameters.AddWithValue("$title", incident.Title);
            cmd.Parameters.AddWithValue("$description", incident.Description);
            cmd.Parameters.AddWithValue("$timestamp", incident.Timestamp.ToString("o"));
            cmd.Parameters.AddWithValue("$detailsJson", incident.DetailsJson);
            cmd.Parameters.AddWithValue("$synced", incident.SyncedToCloud ? 1 : 0);

            await cmd.ExecuteNonQueryAsync();
        }

        public async Task<List<SecurityIncident>> GetPendingIncidentsAsync(int maxLimit = 100)
        {
            await InitializeAsync();
            var list = new List<SecurityIncident>();

            using var connection = new SqliteConnection(_connectionString);
            await connection.OpenAsync();

            using var cmd = connection.CreateCommand();
            cmd.CommandText = @"
                SELECT id, device_id, event_type, severity, title, description, timestamp, details_json, synced_to_cloud
                FROM incidents
                WHERE synced_to_cloud = 0
                ORDER BY timestamp ASC
                LIMIT $limit;
            ";
            cmd.Parameters.AddWithValue("$limit", maxLimit);

            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                list.Add(new SecurityIncident
                {
                    Id = reader.GetString(0),
                    DeviceId = reader.GetString(1),
                    EventType = reader.GetString(2),
                    Severity = Enum.TryParse<IncidentSeverity>(reader.GetString(3), out var sev) ? sev : IncidentSeverity.Critical,
                    Title = reader.GetString(4),
                    Description = reader.GetString(5),
                    Timestamp = DateTime.Parse(reader.GetString(6)),
                    DetailsJson = reader.GetString(7),
                    SyncedToCloud = reader.GetInt32(8) == 1
                });
            }
            return list;
        }

        public async Task MarkIncidentSyncedAsync(string incidentId)
        {
            await InitializeAsync();
            using var connection = new SqliteConnection(_connectionString);
            await connection.OpenAsync();

            using var cmd = connection.CreateCommand();
            cmd.CommandText = "UPDATE incidents SET synced_to_cloud = 1 WHERE id = $id;";
            cmd.Parameters.AddWithValue("$id", incidentId);
            await cmd.ExecuteNonQueryAsync();
        }

        public async Task<List<SecurityIncident>> GetRecentIncidentsAsync(int limit = 50)
        {
            await InitializeAsync();
            var list = new List<SecurityIncident>();

            using var connection = new SqliteConnection(_connectionString);
            await connection.OpenAsync();

            using var cmd = connection.CreateCommand();
            cmd.CommandText = @"
                SELECT id, device_id, event_type, severity, title, description, timestamp, details_json, synced_to_cloud
                FROM incidents
                ORDER BY timestamp DESC
                LIMIT $limit;
            ";
            cmd.Parameters.AddWithValue("$limit", limit);

            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                list.Add(new SecurityIncident
                {
                    Id = reader.GetString(0),
                    DeviceId = reader.GetString(1),
                    EventType = reader.GetString(2),
                    Severity = Enum.TryParse<IncidentSeverity>(reader.GetString(3), out var sev) ? sev : IncidentSeverity.Critical,
                    Title = reader.GetString(4),
                    Description = reader.GetString(5),
                    Timestamp = DateTime.Parse(reader.GetString(6)),
                    DetailsJson = reader.GetString(7),
                    SyncedToCloud = reader.GetInt32(8) == 1
                });
            }
            return list;
        }

        public async Task SetConfigAsync(string key, string plainValue)
        {
            await InitializeAsync();
            string encrypted = DpapiVault.Protect(plainValue);

            using var connection = new SqliteConnection(_connectionString);
            await connection.OpenAsync();

            using var cmd = connection.CreateCommand();
            cmd.CommandText = @"
                INSERT OR REPLACE INTO device_config (key, value_encrypted, updated_at)
                VALUES ($key, $val, $time);
            ";
            cmd.Parameters.AddWithValue("$key", key);
            cmd.Parameters.AddWithValue("$val", encrypted);
            cmd.Parameters.AddWithValue("$time", DateTime.UtcNow.ToString("o"));
            await cmd.ExecuteNonQueryAsync();
        }

        public async Task<string?> GetConfigAsync(string key)
        {
            await InitializeAsync();
            using var connection = new SqliteConnection(_connectionString);
            await connection.OpenAsync();

            using var cmd = connection.CreateCommand();
            cmd.CommandText = "SELECT value_encrypted FROM device_config WHERE key = $key;";
            cmd.Parameters.AddWithValue("$key", key);

            var result = await cmd.ExecuteScalarAsync();
            if (result != null && result is string encrypted && !string.IsNullOrEmpty(encrypted))
            {
                return DpapiVault.Unprotect(encrypted);
            }
            return null;
        }

        public async Task LogAuditAsync(string action, string details)
        {
            await InitializeAsync();
            using var connection = new SqliteConnection(_connectionString);
            await connection.OpenAsync();

            using var cmd = connection.CreateCommand();
            cmd.CommandText = @"
                INSERT INTO audit_logs (id, action, details, timestamp)
                VALUES ($id, $action, $details, $time);
            ";
            cmd.Parameters.AddWithValue("$id", Guid.NewGuid().ToString("N"));
            cmd.Parameters.AddWithValue("$action", action);
            cmd.Parameters.AddWithValue("$details", details);
            cmd.Parameters.AddWithValue("$time", DateTime.UtcNow.ToString("o"));
            await cmd.ExecuteNonQueryAsync();
        }

        public void Dispose()
        {
            // SqliteConnection uses connection pooling, resources are cleared cleanly.
        }
    }
}
