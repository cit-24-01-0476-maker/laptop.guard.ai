using System;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace LaptopGuard.Service
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var host = Host.CreateDefaultBuilder(args)
                .UseWindowsService(options =>
                {
                    options.ServiceName = "LaptopGuardSentinel";
                })
                .ConfigureServices((hostContext, services) =>
                {
                    services.AddHostedService<SentinelService>();
                })
                .Build();

            await host.RunAsync();
        }
    }
}
