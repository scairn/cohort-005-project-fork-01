# Coding standards

## Fail with a thrown response, not a return value

A loader or an action that cannot continue throws. It does not return an
error shape for the component to unpack.

```ts
if (!course) throw data("Course not found", { status: 404 });
```

The route then has one success path. A returned error shape gives every
component a second path to forget about.

## Parse untrusted input with a schema, at the edge

Form data, search parameters and request bodies get a zod schema before the
values reach any query. Parse once, at the boundary; after that the value has
a type and you do not check it again. Coerce numbers through the schema, not
`Number()`: `Number("")` is `0`, and an empty `lessonId` once opened lesson 0
for every learner. `npm run lint:oxlint` catches `Number()` on `params`, form
data and search params, except in the files on its exemption list.

## Check permission in the action, not only the loader

A loader guard does not protect an action. They are separate requests. For a
week anybody who was signed in could approve a refund by posting to
`/admin/refunds`.

## A route does not query data a module owns

Once a module owns a feature's data, the route asks the module for it and
does not import `~/db` or `drizzle-orm` itself. The instructor analytics
route gets everything from `instructorAnalytics`. A query in the loader
splits the feature's rules across two files, and the module's tests stop
covering what the page shows. `npm run lint:boundaries` enforces this for the
instructor analytics route only; apply it to every other module by hand. See
[app/modules/README.md](./app/modules/README.md).

## Arrange tests through the module under test

Test setup calls the module's own functions. When the function you need does
not exist, add it to the module rather than inserting rows directly, so a
change to how the module stores its data leaves its tests alone.

When no module owns the writes yet (the curriculum and quiz tables are written
only from instructor routes), insert the rows in one `fixtures.ts` in the
module's `tests/` folder, with a comment at the top naming the module that
should own them. That keeps the debt in one place, ready to move.

## Keep files under 5000 tokens

Keep every file under 5000 tokens. The pre-commit hook rejects a commit that
touches a file over the limit, including one that was already over it. The
split that follows is in scope for any ticket. Review it for one thing: that
no behaviour changed. It is not scope creep.

## Moved code keeps its old violations

Code moved without a change in behaviour keeps any violation it already had on
main. Leave each one as a finding marked _follow-up_, for its own ticket. A
follow-up does not count towards CHANGES REQUESTED. Fixing it in the same pull
request widens a change nobody asked for.

## Wrap related writes in a transaction

Two writes that must both land, or neither, go in a transaction. If the second
one fails and the first stayed, you have invented a state nothing knows how to
read. (The refund bug: the refund was approved, the enrollment was never
ended, and the learner kept the course.)

## Do not read from the database in a loop

One query per item is N+1 queries. Use a join, or one query with an `IN`. The
notes loader ran one query per lesson, forty lessons per course.
`npm run lint:oxlint` catches a select inside a loop or an array callback,
except in the files on its exemption list.

## Paginate anything that can grow

A query with no limit is fine on a seeded database and fatal on a real one.
If the row count is a function of how long the product has been alive, add a
limit. The instructor's students page timed out on the first big course.

## Soft-delete anything a person can point at

If another row references it, or a person has a link to it, do not delete it.
Mark it deleted and filter it out on read. Deleting a lesson used to take the
learners' notes and bookmarks with it.

## Enumerations live in the schema file

A status string that the code compares against is an enum in `app/db/schema.ts`,
not a literal repeated in six places. Refund status was `"pending"` in four
files and `"Pending"` in one.

## Read a configured value from the row that stores it

When a row stores a setting, the code reads it from the row. The quiz pass mark
was hard-coded at `> 0.7` while each quiz stores its own `passingScore`, and
the Student is shown that one.

## Inject the clock

A function that calls `Date.now()` cannot be tested at a fixed moment. Take
the time as an argument. The refund window tests failed every night at
midnight until we did this. `npm run lint:oxlint` enforces this in
`app/modules/`; apply it elsewhere by hand.

## Keep secrets on the server

Anything the browser can read is public. A secret is read only in a
`.server` file.

## Do not put a side effect in the render path

Rendering is for working out what the output is, not for doing something.
Anything that touches the outside world belongs in an effect or an action.

## Derive, do not store

If a value can be worked out from another value you already hold, work it out.
Storing it gives you two things that must agree, and one day they will not.

```ts
// Bad
const [items, setItems] = useState(rows);
const [count, setCount] = useState(rows.length);

// Good
const [items, setItems] = useState(rows);
const count = items.length;
```

## Key local state by the route's parameter

React Router reuses a route's components when only its parameter changes. A
component that holds local state on such a route takes the parameter as its
`key`, or the state follows the person to the next page. A draft note once
carried over from lesson 18 to lesson 19, and Save wrote it onto lesson 19.

## Announce async status

Status that changes after an action, such as "Saved" or an error, sits in a
live region (`role="status"` or `aria-live="polite"`) so a screen reader
announces it.

## A comment explains why

Name and extract until a comment is unnecessary. A comment earns its place
only for a _why_ the code cannot express: a constraint, a decision, a link to
the ADR behind it. A comment that restates _what_ the code does goes stale the
first time the code changes.
