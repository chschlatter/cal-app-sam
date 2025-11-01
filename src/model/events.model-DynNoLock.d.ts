import { DB } from "../db2";

export interface Event {
  id: string;
  title: string;
  start: string;
  end: string;
  type?: string;
  color?: string;
  version?: number;
}

export interface EventsErrorData {
  overlap_start?: boolean;
  overlap_end?: boolean;
  maxDays?: number;
  minDays?: number;
}

export class EventsError extends Error {
  code:
    | "start_end_required"
    | "event_not_found"
    | "event_overlaps"
    | "event_max_days"
    | "event_min_days"
    | "event_validation"
    | "event_updated";
  data?: EventsErrorData;

  constructor(
    message: string,
    errorCode: EventsError["code"],
    data?: EventsErrorData
  );
}

export class EventsModelNoLock {
  constructor();

  /**
   * Retrieves a list of events within the specified start and end dates.
   * @param start - The start date of the range.
   * @param end - The end date of the range.
   * @returns A promise that resolves to an array of event objects.
   */
  list(start: string, end: string): Promise<Event[]>;

  /**
   * Creates a new event.
   * @param event - The event to create.
   * @returns A promise that resolves to the created event.
   */
  create(event: Event): Promise<Event>;

  /**
   * Creates multiple events.
   * @param events - The events to create.
   * @returns A promise that resolves to the created events.
   */
  batchCreate(events: Event[]): Promise<Event[]>;

  /**
   * Updates an event.
   * @param eventFromDb - The existing event from the database.
   * @param event - The updated event data.
   * @returns A promise that resolves to the updated event.
   */
  update(eventFromDb: Event, event: Event): Promise<Event>;

  /**
   * Retrieves an event by its ID.
   * @param eventId - The ID of the event to retrieve.
   * @returns A promise that resolves to the event.
   */
  get(eventId: string): Promise<Event>;

  /**
   * Removes an event.
   * @param event - The event to remove.
   * @returns A promise that resolves when the event is removed.
   */
  remove(event: Event): Promise<void>;

  /**
   * Deletes events within the specified year.
   * @param year - The year to delete events for.
   * @returns A promise that resolves when the events are deleted.
   */
  deleteEventsByYear(year: string): Promise<void>;
}
