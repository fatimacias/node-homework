# Node.js Fundamentals

## What is Node.js?
Node.js is a JavaScript runtime that allows JavaScript to run outside of the browser.  
It uses Google's V8 engine to execute code at high speed and provides access to system-level functionality such as the file system, network, and processes. Node.js is commonly used to build backend applications, APIs, command-line tools, and real-time services.


## How does Node.js differ from running JavaScript in the browser?
JavaScript in the browser runs in a restricted environment designed for security.  
It has access to the DOM, `window`, `document`, and browser APIs, but **cannot**:

- read or write files directly  
- access the operating system  
- open arbitrary network ports  
- run server-side processes  

Node.js, on the other hand:

- does **not** have DOM, `window`, or `document`  
- provides system-level modules (`fs`, `path`, `os`, `http`)  
- allows creating servers, reading files, running processes  
- gives direct access to the local machine’s environment  

The browser controls the execution environment, while in Node **the developer controls the environment**.


## What is the V8 engine, and how does Node use it?
The **V8 engine** is Google's high-performance JavaScript engine used inside the Chrome browser.  
It compiles JavaScript into machine code to make it run very fast.

Node.js uses V8 to execute JavaScript on the server. Additionally, Node integrates V8 with:

- system-level C++ bindings  
- an event loop  
- asynchronous I/O APIs  

This combination allows Node to handle thousands of operations efficiently without blocking.


## What are some key use cases for Node.js?
Node.js is commonly used for:

- **REST APIs and backend servers**  
- **Real-time applications** (chats, notifications, WebSockets)  
- **Microservices** architectures  
- **Command-line tools (CLIs)**  
- **Automation scripts**  
- **Streaming applications**  
- **Server-side rendering**  
- **Proxy servers and middleware**  

Node is especially strong where asynchronous, non-blocking operations are important.


## Explain the difference between CommonJS and ES Modules. Give a code example of each.

**CommonJS (default in Node.js):**
- Traditional Node.js module format  
- Uses `require()` to import and `module.exports` to export  
- Default in many Node projects

```js

// math.js
function add(a, b) {
  return a + b;
}

module.exports = { add };

// app.js
const { add } = require('./math');
console.log(add(2, 3));


```

**ES Modules (supported in modern Node.js):**
- Modern JavaScript standard
- Uses import and export
- Common in frontend frameworks like React and in newer Node projects
```js

// math.mjs
export function add(a, b) {
  return a + b;
}

// app.mjs
import { add } from './math.mjs';
console.log(add(2, 3));

``` 