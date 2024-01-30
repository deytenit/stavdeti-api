import fetch from "node-fetch";

/**
 * Shared types definitions.
 */

/**
 * Represents status of specific task submissioned by contestant.
 *
 * @remarks AC - Accepted.
 *          WA - Unsuccesful submission (Wrong Answer, Runtime Error, etc.).
 *          NS - No submissions for task were made.
 *
 * @public
 */
export type taskStatus = "AC" | "WA" | "NS";

/**
 * Represents a single contest task submissioned by contestant.
 *
 * @public
 *
 * @typeparam Status - {@link taskStatus}
 */
export interface Task<Status extends taskStatus = taskStatus> {
    /** Submission status. */
    status: Status;

    /** Amount of attemps made. */
    attempts: number;

    /**
     * Penalty gained.
     *
     * @remarks null if status is not "AC"
     */
    penalty: Status extends "AC" ? number : null;

    /** Contestant submissioned this task. */
    contestant: ContestantBase;
}

/**
 * Represents single participant of a contest.
 *
 * @public
 */
export interface ContestantBase {
    /** Ranking in contest leaderboard. */
    rank: number;

    /** Username of contestant. */
    user: string;

    /** Amount of "AC" tasks. */
    solved: number;

    /** Sum of all task penalties. */
    penalty: number;

    /** Contest bounded with this interface. */
    contest: ContestBase;
}

/**
 * Represents single participant of a contest.
 * With back reference to contest.
 *
 * @public
 */
export interface Contestant extends ContestantBase {
    /** Task statuses of contestant. */
    tasks: Task[];
}

/**
 * Represents a single contest.
 *
 * @public
 */
export interface ContestBase {
    /** Contest ID. */
    id: string;

    /** Contest title. */
    title: string;

    /** Amount of tasks in the contest. */
    amount: number;
}

/**
 * Represents a single contest.
 * With Contestants of this contest.
 *
 * @public
 */
export interface Contest extends ContestBase {
    /** List of contestants. */
    contestants: Contestant[];
}

/**
 * Internal Functions.
 */

/**
 * Parses single row of task statuses of contestant on specific contest.
 *
 * @internal
 *
 * @returns List of task bodies.
 *
 * @param bodies - HTML table cells representing task status.
 * @param contestant - Contestant task statuses of.
 */
function tasksDeserializer(bodies: string[], contestant: ContestantBase): Task[] {
    return bodies.map((body) => {
        const _status = body
            .match(/(?<=<span class="((AC)|(NS)|(WA))">)(\n||.)*?(?=<)/)
            ?.at(0)
            ?.trim();
        const _penalty = body
            .match(/(?<=<span class="TM">)(\n||.)*?(?=<)/)
            ?.at(0)
            ?.trim();

        if (!_status) {
            throw new Error(
                "stavdeti-api: Error! Cannot parse task status." +
                    `Contestant: '${contestant.user}'` +
                    `Contest: ${contestant.contest.id}`
            );
        }

        const status = (() => {
            switch (_status[0]) {
                case "+":
                    return "AC";
                case "-":
                    return "WA";
                default:
                    return "NS";
            }
        })();
        const attempts = _status.length > 1 ? parseInt(_status.slice(1)) : +(status === "AC");
        const penalty = _penalty ? parseFloat(_penalty.replace(":", ".")) : null;

        return {
            status,
            penalty,
            attempts,
            contestant
        };
    });
}

/**
 * Parses contest leaderboard to deserialize contestants information.
 *
 * @internal
 *
 * @returns List of contest's contestants.
 *
 * @param body - HTML table representing contestants.
 * @param contest - Contest which currently deserializes.
 */
function contestantsDeserializer(body: string, contest: ContestBase): Contestant[] {
    const result: Contestant[] = [];

    const trs = body.split("<tr>");

    trs.forEach((tr) => {
        const rank = tr
            .match(/(?<=<td class="rank">)(\n||.)*?(?=<)/)
            ?.at(0)
            ?.trim();
        const user = tr
            .match(/(?<=<td class="user">)(\n||.)*?(?=<)/)
            ?.at(0)
            ?.trim();
        const solved = tr
            .match(/(?<=<td class="solved">)(\n||.)*?(?=<)/)
            ?.at(0)
            ?.trim();
        const penalty = tr
            .match(/(?<=<td class="time">)(\n||.)*?(?=<)/)
            ?.at(0)
            ?.trim();
        const _tasks = Array.from(
            tr.matchAll(/(?<=<td class="task">)(\n||.)*?(?=<\/td>)/g),
            (value) => value[0]
        );

        if (!rank || !user || !solved || !penalty || !_tasks) {
            return;
        }

        const base = {
            rank: parseInt(rank),
            user,
            solved: parseInt(solved),
            penalty: parseInt(penalty),
            contest
        };

        result.push({ ...base, tasks: tasksDeserializer(_tasks, base) });
    });

    return result;
}

/**
 * Shared functions.
 */

/**
 * Scrapes single contest.
 *
 * @public
 *
 * @returns {@link Contest} object.
 *
 * @param id - ID of contest to fetch.
 */
export async function contest(id: string): Promise<Contest> {
    const document = await fetch(`https://contest.stavdeti.ru/olympiad/${id}/show-monitor`).then(
        (res) => res.text()
    );

    const title = document
        .match(
            /(?<=<span class="page-title">)(\n||.)*?(?=\(\d+?:\d+?:\d+?( ||\n)+?из( ||\n)+?\d+?:\d+?:\d+?\)(.||\n)*?<\/span>)/
        )
        ?.at(0)
        ?.trim();

    const amount = document
        .slice(document.indexOf("<thead>"), document.indexOf("</thead>"))
        .match(/<th class="task">/g)?.length;

    const base = {
        id: id,
        title: title ?? "",
        amount: amount ?? 0
    };

    return {
        ...base,
        contestants: contestantsDeserializer(
            document.slice(document.indexOf("<tbody>"), document.indexOf("</tbody>")),
            base
        )
    };
}
