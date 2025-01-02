# DynamoDB data model for cal-app-sam

## Events

FullCalendar Event Objects: https://fullcalendar.io/docs/event-object

- event id (UUID)
- title (owner of event / user)
- start date (inclusive)
- end date (exclusive, i.e. event ends at 00:00:00 of end date)

## Access Patterns

### Get list of events within date range FROM-TO (listEvents)

  - `start-date-index: PK = 'EVENT', FROM < start-date < TO`

### Create new event if it doesn't overlap with existing events (createEvent)

  - check for overlapping events: `PK = 'SLOT', SK between dates of new event`
  - TransactWriteItems:
    - `PK = 'EVENT', SK = event id`:
      create event object (check if item with event-id doesn't exist)
    - `PK = 'SLOT', SK = slot date`:
      create time slot items (check if items don't exist)

### For a given event id, delete an event (deleteEvent)

  - `PK = 'EVENT', SK = event id`: get event object (EVENT-VERSION), and calculate time slots from event
  - TransactWriteItems:
    - `PK = 'EVENT', SK = event id`:
      delete event object if version matches EVENT-VERSION (event did not get updated/deleted in-between)
    - `PK = 'SLOT', SK = slot date`:
      delete time slot items

### For a given event id, update an event (updateEvent)

  - `PK = 'EVENT', SK = event id`: get event object (EVENT-VERSION), and calculate time slots from event
  - compute delta (title, start, end)
  - check for overlapping events: PK = 'SLOT', SK between dates of new event
  - TransactWriteItems:
    - `PK = 'EVENT', SK = event id`:
      update event object and increment version (check if version matches EVENT-VERSION)
    - `PK = 'SLOT', SK = slot date`:
      create slot items from delta (check if items don't exist)
    - `PK = 'SLOT', SK = slot date`:
      delete slot items from delta

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
- start-date: start date YYYY-MM-DD (LSI: start-date-index)
- end-date: end date YYYY-MM-DD (exclusive)
- title: owner of the event
- version: integer, incremented when item is updated

### Event time slots (per night)

Used to concurrently check for event overlaps, without locking the db.

- PK: 'SLOT'
- SK: date YYYY-MM-DD (per night, e.g. 2025-01-02 for night from Jan 2nd to Jan 3rd)

[write-tx]: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html#transaction-apis-txwriteitems
[cond-exp]: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ConditionExpressions.html#Expressions.ConditionExpressions.PreventingOverwrites
