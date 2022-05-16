import fetch from "node-fetch";

export interface ContestParticipant {
    rank: number;
    user: string;
    tasks: string[];
    solved: number;
    time: number;
}

export interface LeaderboardEntry {
    user: string;
    tasks: string[];
    solved: number;
    penalties: number;
    time: number;
}

export interface Leaderboard {
    contests: { id: number; title: string; amount: number }[];
    entries: LeaderboardEntry[];
}

export async function getLeaderboard(contestIds: number[], sorted = true) {
    let response: Leaderboard = { contests: [], entries: [] };
    let amountOfTasks = 0;
    let currentTask = 0;

    for (const id of contestIds) {
        const contestInfo = await getContestInfo(id);

        amountOfTasks += contestInfo.amount;

        response.contests.push(contestInfo);
    }

    for (const contest of response.contests) {
        const standings = await getContestStandings(contest.id);

        for (const participant of standings) {
            const entry = response.entries.find(
                (x) => x.user == participant.user
            );

            if (!entry) {
                response.entries[
                    response.entries.push({
                        user: participant.user,
                        solved: participant.solved,
                        time: participant.time,
                        tasks: Array<string>(amountOfTasks).fill("."),
                        penalties: penaltyCounter(participant.tasks),
                    }) - 1
                ].tasks.splice(
                    currentTask,
                    contest.amount,
                    ...participant.tasks
                );
            } else {
                entry.solved += participant.solved;
                entry.time += participant.time;
                entry.tasks.splice(
                    currentTask,
                    contest.amount,
                    ...participant.tasks
                );
                entry.penalties += penaltyCounter(participant.tasks);
            }
        }

        currentTask += contest.amount;
    }

    if (sorted)
        response.entries.sort((x, y) =>
            x.solved !== y.solved
                ? y.solved - x.solved
                : x.penalties - y.penalties
        );

    return response;
}

export async function getContestStandings(contestId: number) {
    const document = await fetch(
        `https://contest.stavdeti.ru/olympiad/${contestId}/show-monitor`
    ).then((res) => res.text());

    return bodySerializer(
        document.slice(
            document.indexOf("<tbody>"),
            document.indexOf("</tbody>")
        )
    );
}

export async function getContestInfo(contestId: number) {
    const document = await fetch(
        `https://contest.stavdeti.ru/olympiad/${contestId}/show-monitor`
    ).then((res) => res.text());

    const title = /(?<=<span class="page-title">\n*).*?(?=(\n|\())/.exec(
        document
    );
    const amount = document
        .slice(document.indexOf("<thead>"), document.indexOf("</thead>"))
        .match(/<th class="task">/g);

    return {
        id: contestId,
        title: title ? title[0] : "",
        amount: amount ? amount.length : 0,
    };
}

function bodySerializer(body: string): ContestParticipant[] {
    let res: ContestParticipant[] = [];

    const trs = body.split("<tr>");

    for (const tr of trs) {
        const rank = /(?<=\<td class="rank"\>\n*).*?(?=\n*\<)/.exec(tr);
        const user = /(?<=\<td class="user"\>\n*).*?(?=\n*\<)/.exec(tr);
        const solved = /(?<=\<td class="solved"\>\n*).*?(?=\n*\<)/.exec(tr);
        const time = /(?<=\<td class="time"\>\n*).*?(?=\n*\<)/.exec(tr);
        const tasks = tr.match(
            /(?<=\<span class="((AC)|(NS)|(WA))"\>\n*).*?(?=\n*\<)/g
        );

        if (rank && user && solved && time && tasks) {
            res.push({
                rank: parseInt(rank[0]),
                user: user[0],
                solved: parseInt(solved[0]),
                time: parseInt(time[0]),
                tasks: tasks,
            });
        }
    }

    return res;
}

function penaltyCounter(tasks: string[]): number {
    let response = 0;

    for (const task of tasks) {
        if (task.startsWith("+") && task.length > 1)
            response += parseInt(task.substring(1));
    }

    return response;
}
