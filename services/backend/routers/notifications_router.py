from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from services.backend.database import get_db
from services.backend import models, schemas
from services.backend.auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=List[schemas.NotificationResponse])
def get_notifications(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id
    ).order_by(models.Notification.created_at.desc()).limit(100).all()

@router.patch("/{notification_id}/read")
def mark_read(notification_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    notif = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    notif.is_read = True
    db.commit()
    return {"status": "success"}

@router.post("/mark-all-read")
def mark_all_read(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == False
    ).update({models.Notification.is_read: True})
    db.commit()
    return {"status": "success", "message": "All notifications marked as read"}

@router.delete("/clear")
def clear_notifications(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db.query(models.Notification).filter(models.Notification.user_id == current_user.id).delete()
    db.commit()
    return {"status": "success", "message": "Notifications cleared"}
