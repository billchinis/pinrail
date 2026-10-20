# Dedup tickets on save

change-map · acme/api · review · 42
Decided by Maya at 2026-10-20 12:00

**Changes requested**: Dedup tickets on save

## Comments

1. **Part** *POST /tickets*
   Return the id of the existing ticket with the 409.
2. **Interaction** *recent with key (Tickets → tickets)*
   Ten seconds is short for a slow network.
   Make it a setting.
3. `web/src/TicketForm.tsx:47–49`
   Keep the key after a failed save, so a retry sends it again.
4. `lib/helpdesk/tickets.ex:76` (the old side)
   Keep the old doc's example.
5. **Screenshot** *Save while saving* of *Ticket form*, after, the area at 60% across and 72% down, 30% × 16% of the image
   The spinner hides the button's label.
6. **Transition** *failed / setSaving(false)* in the state diagram *The Save button*
   Show why the save failed.

Reviewed: API client; createTicket (Ticket form → API client); **Transition** *press Save / ignored* in the state diagram *The Save button*
