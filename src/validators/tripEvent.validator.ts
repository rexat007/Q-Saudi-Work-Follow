import { TripEventEntity } from '../types/entities';
import { ValidationResult, ValidationError } from '../types/common';

export class TripEventValidator {
  static validate(event: Partial<TripEventEntity>): ValidationResult {
    const errors: ValidationError[] = [];

    if (!event.eventId || !event.eventId.trim()) {
      errors.push({
        field: 'eventId',
        code: 'REQUIRED',
        messageAr: 'معرّف الحدث مطلوب',
        messageEn: 'Event ID is required',
      });
    }

    if (!event.tripId || !event.tripId.trim()) {
      errors.push({
        field: 'tripId',
        code: 'REQUIRED',
        messageAr: 'معرّف الرحلة مطلوب للحدث',
        messageEn: 'Trip ID is required for event',
      });
    }

    if (!event.eventType || !event.eventType.trim()) {
      errors.push({
        field: 'eventType',
        code: 'REQUIRED',
        messageAr: 'نوع الحدث مطلوب',
        messageEn: 'Event type is required',
      });
    }

    if (!event.actor?.userId) {
      errors.push({
        field: 'actor.userId',
        code: 'REQUIRED',
        messageAr: 'معرّف الفاعل (المستخدم/السائق) مطلوب للتوثيق الزمني',
        messageEn: 'Actor user ID is required for event timestamping',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
