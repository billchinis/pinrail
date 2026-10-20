# Sequence and state diagrams

The map shows which parts a change touches and which talk to each other.
Add a diagram only when that is not enough to review the change:

- a **sequence** when the order of the calls matters, such as a retry, a
  handshake, a background job, a callback or a race;
- a **state** diagram when the change adds or changes the states of
  something, such as a status, a button, a job or a connection.

Each diagram is a tab beside the map, in the payload's `diagrams`. Keep one
to what the change touches, and add two or three at most.

## Linking a diagram to the map

A participant that is a part of the map names it with `node`, and a message
that is an interaction of the map names it with `edge`. They are then the
same thing in the review: they share their files, comments and reviewed
mark. An entity without a link has its own `status`, `summary` and
`changes`, as a part does.

## A sequence

Participants go from left to right, and messages from top to bottom. A
message's `kind` is `call` (the default), `async`, `reply`, or `self` for a
message to the sender itself. `groups` frame a run of messages, from
`first` to `last`, as `alt`, `opt`, `loop` or `par`.

A retried save that the API answers with the ticket it already created:

```json
{ "id": "second-save", "kind": "sequence", "title": "Save pressed twice",
  "summary": "A retry after a lost response sends the same key, and gets the first ticket back.",
  "participants": [
    { "id": "form", "title": "Ticket form", "node": "ticket-form" },
    { "id": "api", "title": "POST /tickets", "node": "tickets-endpoint" },
    { "id": "tickets", "title": "Tickets", "node": "tickets-context" },
    { "id": "db", "title": "tickets", "node": "tickets-table" }
  ],
  "messages": [
    { "id": "m1", "from": "form", "to": "form", "kind": "self", "label": "second press: ignored",
      "status": "added", "changes": [{ "file": "web/src/TicketForm.tsx", "lines": [[46, 47]] }] },
    { "id": "m2", "from": "form", "to": "api", "label": "POST, the same key", "edge": "post" },
    { "id": "m3", "from": "api", "to": "tickets", "label": "create(params, key)", "edge": "create" },
    { "id": "m4", "from": "tickets", "to": "db", "label": "recent_with_key(key)", "edge": "lookup" },
    { "id": "m5", "from": "db", "to": "tickets", "kind": "reply", "label": "the ticket", "status": "added" },
    { "id": "m6", "from": "api", "to": "form", "kind": "reply", "label": "409 Conflict, the ticket",
      "status": "added", "changes": [{ "file": "lib/helpdesk_web/controllers/ticket_controller.ex", "lines": [[19, 19]] }] }
  ],
  "groups": [
    { "id": "g1", "kind": "alt", "label": "a ticket with the key in the last ten seconds", "first": "m5", "last": "m6" }
  ] }
```

## A state diagram

States have a `kind` of `state` (the default), `initial` or `final`; give
the start and the end no title. A transition's `label` is its event, guard
and action as you would write them, such as `failed / setSaving(false)`. A
transition from a state back to itself is drawn as a loop.

The Save button, which now waits while a save is out:

```json
{ "id": "save-button", "kind": "state", "title": "The Save button",
  "states": [
    { "id": "start", "kind": "initial" },
    { "id": "ready", "title": "Ready", "status": "unchanged" },
    { "id": "saving", "title": "Saving…", "status": "added",
      "changes": [{ "file": "web/src/TicketForm.tsx", "lines": [[62, 64]] }] },
    { "id": "saved", "kind": "final" }
  ],
  "transitions": [
    { "id": "t1", "from": "start", "to": "ready" },
    { "id": "t2", "from": "ready", "to": "saving", "label": "press Save / setSaving(true)", "status": "added" },
    { "id": "t3", "from": "saving", "to": "saving", "label": "press Save / ignored", "status": "added" },
    { "id": "t4", "from": "saving", "to": "ready", "label": "failed / setSaving(false)", "status": "added" },
    { "id": "t5", "from": "saving", "to": "saved", "label": "saved / onSaved(ticket)", "status": "changed" }
  ] }
```

## In the decision

A comment on a diagram's own entity has the target
`{"diagram": "save-button", "item": "t4"}`. A comment on a linked one uses
the map's `node` or `edge` target, as a comment on the map does.
