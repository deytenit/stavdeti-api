import { writeFile } from "fs/promises";
import config from "./config";
import { getLeaderboard, LeaderboardEntry } from "./StavliderAPI";

getLeaderboard(config.contests).then(async (leaderboard) => {
    let tableHead = tableHeadGenerator(leaderboard.contests);
    let tableBody = tableBodyGenerator(leaderboard.entries);

    await writeFile(process.argv[2] || "output.html", tableHead + tableBody);

    console.log("✓ Successfuly generated leaderboard table!");
});

function tableHeadGenerator(
    contests: { id: number; title: string; amount: number }[]
): string {
    let tr1 = `    <tr>
        <th rowspan="2">#</th>
        <th rowspan="2">Participant</th>
        <th rowspan="2">Solved</th>
        <th rowspan="2">Penalty</th>
`;

    let tr2 = "    <tr>\n";

    for (const contest of contests) {
        tr1 += `        <th colspan="${contest.amount}">${contest.title}</th>\n`;
        for (let i = 0; i < contest.amount; i++) {
            tr2 += `    <th>${String.fromCharCode(65 + i)}</th>\n`;
        }
    }

    tr1 += "    </tr>\n";
    tr2 += "    </tr>\n";

    return "<thead>\n" + tr1 + tr2 + "</thead>\n";
}

function tableBodyGenerator(entries: LeaderboardEntry[]): string {
    let body = "";

    for (let i = 0; i < entries.length; i++) {
        let tr = `    <tr>
        <td>${i + 1}</td>
        <td>${entries[i].user}</td>
        <td>${entries[i].solved}</td>
        <td>${entries[i].penalties}</td>
`;

        for (const task of entries[i].tasks) {
            tr += `        <td class="${classDeterminer(task)}">${task}</td>\n`;
        }

        tr += "    </tr>\n";

        body += tr;
    }

    return "<tbody>\n" + body + "</tbody>\n";
}

function classDeterminer(task: string): string {
    return task.startsWith("+") ? "AC" : task.startsWith("-") ? "WA" : "NS";
}
