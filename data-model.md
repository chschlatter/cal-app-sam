# DynamoDB data model

## Events

FullCalendar Event Objects: https://fullcalendar.io/docs/event-object

- event id (UUID)
- title (owner of event / user)
- start date (inclusive)
- end date (exclusive, i.e. event ends at 00:00:00 of end date)

## Access Patterns

- Get list of events between two dates (listEvents)
- When creating a new event, get overlaping events (createEvent)
- Create new event only if it doesn't overlap with existing events (createEvent)
- For a given event id, delete an event (deleteEvent)
- For a given event id, update an event (updateEvent)

## Concurrent creation of new events

- Store event time slots (nights) as items in db
- Use DynamoDB [Write Transaction][write-tx] to create new events (write transactions comply with ACID):
  - Create time slot items for all nights of the event
  - Use [condition expression][cond-exp] for the put commands, to check for overlaping events, i.e. to check if item exists before creating it

## Table Schema

### Events

- PK: 'EVENT'
- SK: start date YYYY-MM-DD
- end_date: end date YYYY-MM-DD
- event-id: event id (UUID, e.g. 0ad42af8-67a7-4895-8626-47335e83cf12)

### Time Slots

- PK: 'SLOT'
- SK: date YYYY-MM-DD (per night, e.g. 2025-01-02 for night from Jan 2nd to Jan 3rd)
- event-id: event id (UUID)

### Indexes

- LSI event-id

[write-tx]: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html#transaction-apis-txwriteitems
[cond-exp]: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ConditionExpressions.html#Expressions.ConditionExpressions.PreventingOverwrites
