from datetime import datetime, timezone, timedelta
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from services.backend.database import Base
from services.backend import models
from services.backend.location import record_device_location

@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session

def fix(**overrides):
    return {"latitude": 0, "longitude": 0, "accuracy_meters": 32,
        "method": "os_location", "captured_at": datetime.now(timezone.utc).isoformat(), **overrides}

def test_sensor_fix_preserves_zero_coordinates_and_accuracy(db):
    loc = record_device_location(db, "test-device", fix())
    db.commit()
    assert (loc.latitude, loc.longitude, loc.accuracy_meters, loc.source) == (0, 0, 32, "os_location")

@pytest.mark.parametrize("payload", [None, {}, fix(method="phone_gps_sync"), fix(latitude=91), fix(longitude=float("nan")), fix(accuracy_meters=0), fix(captured_at=(datetime.now(timezone.utc)-timedelta(hours=1)).isoformat())])
def test_fake_invalid_or_stale_fixes_are_rejected(db, payload):
    assert record_device_location(db, "test-device", payload) is None
    assert db.query(models.DeviceLocation).count() == 0

def test_duplicate_fix_does_not_append_rows(db):
    payload = fix()
    record_device_location(db, "test-device", payload)
    db.commit()
    record_device_location(db, "test-device", payload)
    db.commit()
    assert db.query(models.DeviceLocation).count() == 1
