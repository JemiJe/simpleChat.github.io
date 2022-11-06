# simpleChat.github.io

simple chat v1.0<br/>
all back-end on mockapi.io server<br/>

server should return object `messageObj` with props:<br/>
`messageObj.items` - messages array<br/>
`messageObj.count` - server prop of total number of messages on server (integer)<br/>


example of messageObj.items item on server:<br/>
```
{
    date: "2022-11-01T22:59:39.798Z",    // new Date() from client
    id: "6",                             // mockapi.io server prop (should't send from client)
    userColor: "hwb(260deg 0% 25%)",
    userId: 724525,
    userMessage: "hello!",
    userName: "chrome1",

    isCustom: false,                     // checks for test messages
    trueDate: new Date(),
    trueUserId: 724525
}
```
```
url                         https://mockapi.io/api/v1/messageObj
with api key (example)      https://588c0242ec0215be123e7dee.mockapi.io/api/v1/messageObj
```