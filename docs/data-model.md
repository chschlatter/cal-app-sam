# DynamoDB data model for cal-app-sam

## Events

FullCalendar Event Objects: https://fullcalendar.io/docs/event-object

- event id (UUID)
- title (owner of event / user)
- start date (inclusive)
- end date (exclusive, i.e. event ends at 00:00:00 of end date)

## Access Patterns

### Get list of events within date range FROM-TO (listEvents)

- `startDateIndex: PK = 'EVENT', FROM < start-date < TO`

### Create new event if it doesn't overlap with existing events (createEvent)

- Write TX to put event object and time slot items
  - Event object item:
    `Put: PK = 'EVENT', SK = eventId`:
    create event object (check if item with eventId doesn't exist)
  - Time slot items:
    `Put: PK = 'SLOT', SK = slot date`:
    create time slot items (check if items don't exist)

### For a given event id, delete an event (deleteEvent)

- Get event object to delete; store eventVersion
  `Get: PK = 'EVENT', SK = eventId`
- Write TX to delete event object and time slot items
  - Event object item:
    `Delete: PK = 'EVENT', SK = eventId`:
    delete event object (check if version matches eventVersion)
  - Time slot items:
    `Delete: PK = 'SLOT', SK = slot date`:
    delete time slot items

### For a given event id, update the event (updateEvent)

- Get event object to update; store eventVersion
  `Get: PK = 'EVENT', SK = eventId`
- Calculate time slots to add and delete: deltaSlotItems
- Write TX to update event object and add/delete time slot items
  - Event object item:
    `Update: PK = 'EVENT', SK = eventId`:
    update event object title/start/end and increment version (check if version matches eventVersion)
  - Add time slot items:
    `Put: PK = 'SLOT', SK = slot date`:
    add time slot events from deltaSlotItems (check if item does not exist)
  - Delete time slot items:
    `Delete: PK = 'SLOT', SK = slot date`:
    delete time slot events from deltaSlotItems

## Concurrent creation of new events

- Store event time slots (nights) as items in db
- Use DynamoDB [Write Transaction][write-tx] to create new events (write transactions comply with ACID):
  - Create time slot items for all nights of the event
  - Use [condition expression][cond-exp] for the put commands, to check for overlaping events, i.e. to check if item exists before creating it

## Table Schema

### FullCalendar event objects

Used to store event objects in db.

- PK: 'EVENT'
- SK: event id (UUID format)
- startDate: start date YYYY-MM-DD
- endDate: end date YYYY-MM-DD (exclusive)
- title: owner of the event
- version: integer, incremented when item is updated

- Local Secondary Index (LSI): startDateIndex
  - Hash: PK
  - Range: startDate

### Event time slots (per night)

Used to concurrently check for event overlaps, without locking the db.

- PK: 'SLOT'
- SK: date YYYY-MM-DD (per night, e.g. 2025-01-02 for night from Jan 2nd to Jan 3rd)

[write-tx]: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html#transaction-apis-txwriteitems
[cond-exp]: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ConditionExpressions.html#Expressions.ConditionExpressions.PreventingOverwrites
