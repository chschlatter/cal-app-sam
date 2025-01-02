# DynamoDB data model

## Events

FullCalendar Event Objects: https://fullcalendar.io/docs/event-object

- event id (UUID)
- title (owner of event / user)
- start date (inclusive)
- end date (exclusive, i.e. event ends at 00:00:00 of end date)

## Access Patterns

- Get list of events between two dates (listEvents)
  - PK = 'SLOT', SK between dates
  - create list of event objects in application (event-id, title, start, end)
- Create new event if it doesn't overlap with existing events (createEvent)
  - check for overlapping events: PK = 'SLOT', SK between dates of new event
  - create time slot items with write transaction (check if item exists)
- For a given event id, delete an event (deleteEvent)
  - get time slots for event id: event-id-index: PK = 'SLOT', event-id = event id
  - delete time slot items with write transaction (check item version)
- For a given event id, update an event (updateEvent)
  - get time slots for event id: event-id-index: PK = 'SLOT', event-id = event id
  - compute delta (title, start, end)
  - create, update, delete slot items with write transaction (check item version)

## Concurrent creation of new events

- Store event time slots (nights) as items in db
- Use DynamoDB [Write Transaction][write-tx] to create new events (write transactions comply with ACID):
  - Create time slot items for all nights of the event
  - Use [condition expression][cond-exp] for the put commands, to check for overlaping events, i.e. to check if item exists before creating it

## Table Schema

- PK: 'SLOT'
- SK: date YYYY-MM-DD (per night, e.g. 2025-01-02 for night from Jan 2nd to Jan 3rd)
- event-id: event id in UUID format (e.g. 503fe1d8-1672-44a1-8b28-59b3bf18bc9f)
- title
- version: integer, incremented when item is updated

- LSI event-id (event-id-index)

[write-tx]: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html#transaction-apis-txwriteitems
[cond-exp]: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ConditionExpressions.html#Expressions.ConditionExpressions.PreventingOverwrites
