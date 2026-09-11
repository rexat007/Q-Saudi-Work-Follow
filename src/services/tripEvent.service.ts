import { tripEventRepository } from '../repositories/tripEvent.repository';
import { TripEventValidator } from '../validators/tripEvent.validator';
import { TripEventEntity } from '../types/entities';
import { AuthUserContext } from '../types/common';
import { auth } from '../firebase/config';

export class TripEventService {
  async getTripEvents(projectId: string, tripId: string): Promise<TripEventEntity[]> {
    return tripEventRepository.listByTrip(projectId, tripId);
  }

  async recordEvent(
    payload: Omit<TripEventEntity, 'createdAt' | 'updatedAt' | 'serverTimestamp' | 'createdBy' | 'updatedBy' | 'actor'>,
    context: AuthUserContext
  ): Promise<TripEventEntity> {
    const newEvent = {
      ...payload,
      actor: {
        userId: context.userId,
        role: context.role,
        displayName: context.displayName,
      },
      createdBy: context.userId,
      updatedBy: context.userId,
    };

    const validation = TripEventValidator.validate(newEvent);
    if (!validation.isValid) {
      throw new Error(`خطأ في حدث الرحلة: ${validation.errors.map(e => e.messageAr).join(' | ')}`);
    }

    if (auth.currentUser) {
      await tripEventRepository.create(newEvent);
    }
    return newEvent as TripEventEntity;
  }

  subscribeToTripEvents(projectId: string, tripId: string, onData: (events: TripEventEntity[]) => void) {
    return tripEventRepository.subscribeByTrip(projectId, tripId, onData);
  }
}

export const tripEventService = new TripEventService();
