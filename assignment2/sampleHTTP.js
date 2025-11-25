const http = require("http");

const htmlString = `
<!DOCTYPE html>
<html>
<body>
<h1>Clock</h1>
<button id="getTimeBtn">Get the Time</button>
<p id="time"></p>
<script>
document.getElementById('getTimeBtn').addEventListener('click', async () => {
    const res = await fetch('/time');
    const timeObj = await res.json();
    const timeP = document.getElementById('time');
    timeP.textContent = timeObj.time;
});
</script>
</body>
</html>
`;

const server = http.createServer((req, res) => {
    if (req.method === "GET" && req.url === "/time") 
    {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ time: new Date().toString() }));
    } else if (req.method === "GET" && req.url === "/timePage") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(htmlString);
    } else 
    {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Not found" }));
    }
});

server.listen(8000, () => console.log("HTTP server running on port 8000"));
