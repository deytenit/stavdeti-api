# stavdeti-api | [![npm version](https://badge.fury.io/js/stavdeti-api.svg)](https://badge.fury.io/js/stavdeti-api)

Scraper for contest.stavdeti.ru contest system.

> [!NOTE]
> No further development planned.
>
> > *It would be nice for some kind of API next time.*

## What is it about?

Simple scraper to retrieve contest scoreboards from the website stated abobe.
I used it once and never after.

Single exported method `contest(id)` returns an object of following structure:

```
Contest: {
| id: Contest ID.
| title: Contest title.
| amount: Amount of tasks in contest.
|
| contestants: {
| | rank: Position in leader board.
| | user: Username of contestant.
| | solved: Amount of AC tasks.
| | penalty: Sum penalties of all tasks.
| |
| | tasks: {
| | | status: "AC" | "WA" | "NS".
| | | attempts: Amount of submissions.
| | | penalty: Penalty for the task.
| | }[];
| }[];
}
```

> [!TIP]
> *[index.ts](./src/index.ts)* contains all of the type definitions.

> It was intented to make *one specific task* ~~(by using regexes)~~.

## Licence

This project source code is licenced under the *[MIT Licence](./LICENSE)*
