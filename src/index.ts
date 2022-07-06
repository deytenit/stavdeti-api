import fetch from "node-fetch";

export interface Task {
    status: "AC" | "WA" | "NS" | "BN";
    attempts: number;
    penalty: number | null;
}

export interface Participant {
    rank: number;
    user: string;
    tasks: Task[];
    solved: number;
    penalty: number;
}

export interface Contest {
    id: string;
    title: string;
    amount: number;
    participants: Participant[];
}

export default async function getContest(contestId: string): Promise<Contest> {
    const document = await fetch(
        `https://contest.stavdeti.ru/olympiad/${contestId}/show-monitor`
    ).then((res) => res.text());

    const title = document.match(/(?<=<span class="page-title">)(\n||.)*?(?=<\/span>)/)?.at(0)?.trim();

    const amount = document
        .slice(document.indexOf("<thead>"), document.indexOf("</thead>"))
        .match(/<th class="task">/g)?.length;

    return {
        id: contestId,
        title: title || "",
        amount: amount || 0,
        participants: bodyDeserializer(
            document.slice(
                document.indexOf("<tbody>"),
                document.indexOf("</tbody>")
            )
        )
    };
}

function bodyDeserializer(body: string): Participant[] {
    let result: Participant[] = [];

    const trs = body.split("<tr>");

    for (const tr of trs) {
        const rank = tr.match(/(?<=<td class="rank">)(\n||.)*?(?=<)/)?.at(0)?.trim();
        const user = tr.match(/(?<=<td class="user">)(\n||.)*?(?=<)/)?.at(0)?.trim();
        const solved = tr.match(/(?<=<td class="solved">)(\n||.)*?(?=<)/)?.at(0)?.trim();
        const penalty = tr.match(/(?<=<td class="time">)(\n||.)*?(?=<)/)?.at(0)?.trim();

        const tmp = Array.from(tr.matchAll(/(?<=<td class="task">)(\n||.)*?(?=<\/td>)/g), (value) => value[0]);

        const tasks = tasksDeserializer(tmp || []);

        if (rank && user && solved && penalty && tasks) {
            result.push({
                rank: parseInt(rank),
                user: user,
                solved: parseInt(solved),
                penalty: parseInt(penalty),
                tasks: tasks,
            });
        }
    }

    return result;
}

function tasksDeserializer(tasksInner: string[]): Task[] {
    let result: Task[] = [];

    for (const task of tasksInner) {
        const matchStatus = task.match(/(?<=<span class="((AC)|(NS)|(WA))">)(\n||.)*?(?=<)/)?.at(0)?.trim();
        const matchPenalty = task.match(/(?<=<span class="TM">)(\n||.)*?(?=<)/)?.at(0)?.trim();

        if (!matchStatus) continue;

        const attempts = matchStatus.length > 1 ? parseInt(matchStatus.slice(1)) : matchStatus === "." ? 0 : 1;
        const status = matchStatus[0] === "+" ? "AC" : matchStatus[0] === "-" ? "WA" : "NS";
        const penalty = matchPenalty ? parseFloat(matchPenalty.replace(":", ".")) : null;

        result.push({
            status: status,
            penalty: penalty,
            attempts: attempts
        });
    }

    return result;
}