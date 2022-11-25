// simple chat v1.0 (03 Nov 2022)
// https://github.com/JemiJe/simpleChat.github.io

const sendButton = document.querySelector('#sendBtn');
const chatArea = document.querySelector('#chatTextArea');
const msgInput = document.querySelector('#messageInput');

const setBaseUrl = baseUrl => {
    setStorageData(baseUrl, 'baseUrl');
};

const getBaseUrl = () => {

    if (getStorageData().hasOwnProperty('apiKey')) {
        const apiKey = getStorageData().apiKey;
        if (apiKey) {
            let baseUrlWithApiKey = new URL(getStorageData().baseUrl);
            baseUrlWithApiKey.host = `${apiKey}.` + baseUrlWithApiKey.host;
            return baseUrlWithApiKey;
        } else {
            showCustomMessage('client', `(${apiKey}) missing/invalid apiKey for access to mockapi.io, refresh page and enter api key again`);
            return false;
        }
    }

    return getStorageData().baseUrl;
};

const userInfoInit = (name, apiKey) => {
    if (localStorage.messangerData) return getStorageData();

    setStorageData(setNameAndId(name));
    setBaseUrl('https://mockapi.io/api/v1/messageObj');
    setStorageData(apiKey, 'apiKey');
    setStorageData(false, 'history');
};

const setNameAndId = (name) => {
    const randNum = Math.trunc(Math.random() * 1000000);

    let newName = name ? name.slice(0, 9) : 'user' + randNum;
    const id = randNum;
    const userMsgColor = setUserColorStyle(id);

    return { userName: newName, userId: id, userColor: userMsgColor };
};

const setStorageData = (data, key) => {
    if (key) {
        let prevData = getStorageData();
        prevData[key] = data;
        localStorage.setItem('messangerData', JSON.stringify(prevData));

        let newEvent = new Event('messangerEvent.storageUpdated');
        newEvent.prop = { [key]: data };
        document.dispatchEvent(newEvent);
        return;
    }
    localStorage.setItem('messangerData', JSON.stringify(data));
};
const getStorageData = () => {
    return JSON.parse(localStorage.getItem('messangerData'));
};

const sendMessage = (msg, isServiceMsg, isCustomMessage) => {
    const message = msg;
    clearInput();

    if (isSpecCode(message)) return;

    const { userId, userName, userColor } = isServiceMsg ?
        { userId: 000, userName: 'service', userColor: 'orange' }
        : getStorageData();

    let messageBody = {
        userMessage: message,
        date: new Date(),
        userId,
        userName,
        userColor,

        isCustom: false,
        trueDate: new Date(),
        trueUserId: userId
    };

    if (isCustomMessage) {
        messageBody = msg; // custom message body must be Object
    }

    const baseUrl = getBaseUrl();
    fetch(baseUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify(messageBody)
    })
        .then((response) => {
            if (response.status == 413) {
                showCustomMessage('server', 'overload');
                return;
            }
        });
};

const deleteMessages = async (onlyOne, amount) => {
    const baseUrl = getBaseUrl();
    let resp = await fetch(baseUrl);
    let messages = await resp.json();
    let messagesArr = messages.items;
    let messagesOnServer = messages.count;

    let messagesIds = [messagesArr[1].id];                //exclude fist service msg 
    if (!onlyOne) {
        messagesIds = messagesArr.map(msg => msg.id);
        messagesIds.shift();                                //exclude fist service msg 
    }
    if (!onlyOne && +amount < messagesOnServer) {
        messagesIds = messagesIds.filter((msgId, i) => i < +amount);
    }

    try {
        for (let id of messagesIds) {
            await new Promise(r => setTimeout(r, 300));
            await fetch(`${baseUrl}/${id}`, { method: 'DELETE' });
        }
        console.log('some messages have been deleted (due to refreshChatAreaLoop2 .maxMsgsOnServer value )');
    } catch (error) {
        console.log(error);
    }
};

const getAndShowMessage2 = async () => {
    let curentMsgsAmount = getStorageData().messagesCounter || 0;

    try {
        const baseUrl = getBaseUrl();
        let resp = await fetch(baseUrl);

        if (resp.ok) {

            let messages = await resp.json();
            let msgsArrCurrent = messages.items;
            let msgsArrPrev = getStorageData().messagesArr;

            if (msgsArrCurrent.length > msgsArrPrev.length) {

                setStorageData(msgsArrCurrent, 'messagesArr');

                msgsArrCurrent.splice(0, msgsArrPrev.length);

                for (let msg of msgsArrCurrent) {
                    if (msg !== undefined) showMessage(msg);
                    setStorageData(++curentMsgsAmount, 'messagesCounter');
                    setStorageData([...getStorageData().history, msg], 'history');
                }
            }
        }
        if (resp.status == 429) {
            showCustomMessage('server', 'too many requests: ' + error);
        }
    } catch (error) {
        if (error) console.log(error);
        setStorageData('error', 'isOnline');
        if (error) showCustomMessage('server', 'server error: ' + error);
    }
}

const chatAreaInit = () => {

    if (!localStorage.messangerData) return;

    const baseUrl = getBaseUrl();
    fetch(baseUrl)
        .then(response => {

            if (!response.ok) {
                throw new Error(response.status + ' status error');
            }

            if (response.status !== 200) {
                chatAreaInit();
                return;
            }

            return response.json();
        })
        .then(allMessages => {

            clearChatArea();

            const allMessagesItems = allMessages.items;

            if (!getStorageData().history) setStorageData(allMessagesItems, 'history');

            if (allMessagesItems.length) {

                let lastMsgNumber = Number.parseInt(allMessagesItems[allMessagesItems.length - 1].id);
                if (lastMsgNumber) setStorageData(lastMsgNumber, 'messagesCounter');

                setStorageData(+allMessagesItems[0].id, 'msgIdToDelete');

                setStorageData(allMessagesItems, 'messagesArr');

                for(let i = 0; i < allMessagesItems.length; i++) {
                    if( i === allMessagesItems.length - 1 ) {
                        showMessage(allMessagesItems[i], false, 'transition: 0.5s;animation: messageAppearing 1s;');
                        return;
                    }
                    showMessage(allMessagesItems[i]);
                }

                // for (let msg of allMessagesItems) {
                //     showMessage(msg);
                // }

            } else {
                sendMessage('server is online', true);
                setStorageData(1, 'messagesCounter');
                setStorageData([], 'messagesArr');
            }
        })
        .catch(error => {
            console.log(error);
            setStorageData('error', 'isOnline');
            showCustomMessage('server', 'server error: ' + error);
        });
}

const dateFormating = dateObj => {
    const today = new Date().getTime();
    const date = new Date(dateObj).getTime();

    const prevWeek = new Date(new Date().setDate(new Date().getDate() - 7)).getTime();
    const prevMin = new Date(new Date().setMinutes(new Date().getMinutes() - 1)).getTime();
    const prevDay = new Date(new Date().setDate(new Date().getDate() - 1)).getTime();
    const prevMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).getTime();

    let [month1, day, hourMin] = new Date(date).toLocaleString('en-GB', {
        month: 'short',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).split(' ');

    if (prevWeek < date) day = new Date(date).toLocaleString('en-GB', { weekday: 'short' });
    if (prevWeek > date) day = new Date(date).toLocaleString('en-GB', { day: '2-digit' });
    if (prevDay < date) day = '';
    if (prevMonth < date && prevWeek < date) month1 = '';
    if (prevMin > date) hourMin = hourMin.slice(0, 5);
    if (new Date(date).getFullYear() < new Date(today).getFullYear()) hourMin = `${hourMin} ${new Date(date).getFullYear()}`;

    return { monthStr: month1, dayStr: day.slice(0, 3), hourMinStr: hourMin };
};

const showMessage = (msg, isDebug, customStyle) => {
    if (!msg) return;

    const italic = isDebug ? 'fst-italic' : '';
    const { userName, userMessage, userColor, date, isCustom } = msg;

    const dateStr = dateFormating(date);

    const isCustomBadge = isCustom ? `<span class="badge text-bg-warning">custom</span>` : '';
    let newStyle = customStyle ? customStyle : '';
    // newStyle += 'transition: 0.5s;animation: messageAppearing 1s;';
    const newBackgroundColor = userColor.includes('hwb') ? userColor.replace(/\)/gm, ' / 33%)') : ''; // color in hwb

    chatArea.innerHTML += `
    <div class="messageRow2 ${italic}" style="color: ${userColor};background-color: ${newBackgroundColor};${newStyle}">
        <div class="fw-semibold messageRow2__userName">
            <div class="messageRow2__userName__name">${userName}:</div>
            <div class="messageRow2__userName__date">${dateStr.monthStr} ${dateStr.dayStr} ${dateStr.hourMinStr}</div>
        </div>
        <div class="messageRow2__userMessage">${isCustomBadge} ${userMessage}</div>
    </div>
    `;

    chatArea.scrollTop = chatArea.scrollHeight;
};

const showCustomMessage = (type, msg, customStyle) => {
    const date = new Date();
    showMessage({
        userName: type || 'error',
        userMessage: msg,
        userColor: '#ffa500',
        date
    }, true, customStyle);
};

const clearChatArea = () => {
    chatArea.value = '';
};

class refreshChatAreaLoop2 {

    constructor(rateMs1, stopAfter1, maxMsgs) {
        this.rateMs = rateMs1 || 3000;
        this.stopAfter = stopAfter1;
        this.maxMsgsOnServer = (maxMsgs && maxMsgs < 95) ? maxMsgs : 95; // restricts of mockapi.io (max 100)
    }

    async deleteExtraMsgOnServer() {
        const baseUrl = getBaseUrl();
        let resp = await fetch(baseUrl);
        let messages = await resp.json();
        let serverMsgAmount = messages.count;
        setStorageData(serverMsgAmount, 'messagesOnServerAmount');

        if (serverMsgAmount > this.maxMsgsOnServer) {
            await deleteMessages(true);
            chatAreaInit();
        }
    }

    checkAndDeleteMsgs() {
        const sec = new Date().getSeconds();
        const checkRate = 5;

        if (sec % checkRate == 0) this.deleteExtraMsgOnServer();
    }

    start(isUpdated) {

        if (this.intervalId) return;

        this.intervalId = setInterval(async () => {
            await getAndShowMessage2();
            this.checkAndDeleteMsgs();
        }, this.rateMs);

        if (this.stopAfter) {
            setTimeout(() => {
                this.stop();
            }, this.stopAfter);
            if (isUpdated) showCustomMessage('client', `refresh will stop after ${this.stopAfter / 1000} sec.`);
        }

        if (isUpdated) showCustomMessage('client', 'refresh has been restarted');
        if (isUpdated && this.stopAfter == 0) showCustomMessage('client', 'refresh is permanent');
        this.updateInfo(true);
    }

    stop(isUpdated) {
        clearInterval(this.intervalId);
        this.intervalId = null;
        if (this.stopAfter && !isUpdated) showCustomMessage('client', 'refresh has been stopped');
        this.updateInfo(false);
    }

    update(rateMs1, stopAfter1) {
        if (rateMs1 && (stopAfter1 || stopAfter1 == 0)) {
            this.rateMs = rateMs1;
            this.stopAfter = stopAfter1;

            this.stop(true);
            this.start(true);
        }

        this.updateInfo(true);
    }

    updateInfo(isOnline) {
        setStorageData(this.rateMs, 'chatRefreshRateMs');
        setStorageData(this.stopAfter, 'chatStopRefreshAfterMs');
        setStorageData(isOnline, 'isOnline');
        //updateInfoString();
    }
}

const updateInfoString = () => {
    let chatInfoElem = document.querySelector('#chatInfo');
    let { chatRefreshRateMs, chatStopRefreshAfterMs, messagesOnServerAmount } = getStorageData();
    chatInfoElem.textContent = `refresh each: ${chatRefreshRateMs / 1000} sec.; ` +
        `stop after: ${chatStopRefreshAfterMs / 1000} sec.; ` +
        `messages on server: ${messagesOnServerAmount} ` +
        `(max: ${refresh.maxMsgsOnServer})`;

    let header = document.querySelector('.headerName');
    if (getStorageData().isOnline == 'error') {
        header.classList.replace('isOnline', 'isOffline');
    }
    else if (getStorageData().isOnline) {
        header.style.cssText = '';
        header.classList.replace('isOffline', 'isOnline');
    } else if (!getStorageData().isOnline) {
        header.classList.remove('isOnline');
        header.classList.remove('isOffline');
    }
};

const clearInput = () => {
    msgInput.value = '';
};

const setUserColorStyle = (id) => {
    const colorCode = Math.trunc((id / 1000000) * 359);;
    return `hwb(${colorCode}deg 0% 25%)`;
};

const isSpecCode = msg => {
    if (msg[0] === '/') {
        let event = new Event('messangerEvent.isCode');
        event.code = msg;
        document.dispatchEvent(event);
        return true;
    }
    else {
        return false;
    }
};

const showUserInfo = () => {
    const userInfo = getStorageData();
    showCustomMessage('client', `${userInfo.userName}: id ${userInfo.userId} color ${userInfo.userColor}`);
};

const toggleDarkTheme = state => {

    const elemsToDark = ['body', '#messageInput', 'h3', '#sendBtn', '#darkThemeBtn', '#chatTextArea', '#historyBtn'];
    for (let elemName of elemsToDark) {

        let elem = document.querySelector(elemName);

        if (state == 'on') {
            elem.classList.add('darkTheme');
            elem.classList.replace('btn-outline-primary', 'btn-outline-warning');
        }
        else if (state == 'off') {
            elem.classList.remove('darkTheme');
            elem.classList.replace('btn-outline-warning', 'btn-outline-primary');
        }
    }
}

const showHistory = () => {
    const msgsArr = getStorageData().history;
    const style = 'background-color: #ffa60029;';

    showCustomMessage('client', 'messages history:', style);
    for (let msg of msgsArr) {
        showMessage(msg, false, style);
    }
    showCustomMessage('client', `total messages in history: ${msgsArr.length}`, style);
};

const isOnlineLastHour = () => {
    const prevTime = getStorageData().isOnlineTimeStamp;
    const nowMinusHour = new Date(new Date().setHours(new Date().getHours() - 1)).getTime();

    if (nowMinusHour > prevTime) {
        setStorageData(new Date().getTime(), 'isOnlineTimeStamp');
        return false;
    }
    return true;
};

// events ---
sendButton.addEventListener('click', () => { if (msgInput.value) sendMessage(msgInput.value) });

const darkThemeBtn = document.querySelector('#darkThemeBtn');
darkThemeBtn.addEventListener('click', () => {
    let newValue = getStorageData().isDark == 'on' ? 'off' : 'on';
    setStorageData(newValue, 'isDark');
});

const historyBtn = document.querySelector('#historyBtn');
historyBtn.addEventListener('click', () => {
    showHistory();
});

msgInput.addEventListener('keypress', event => {
    if (event.code === 'Enter') if (msgInput.value) sendMessage(msgInput.value);
});
document.querySelector('#clearCacheBtn').addEventListener('click', () => {

    localStorage.removeItem('messangerData');
    showCustomMessage('client', 'your username and data have been deleted in localStorage, reload this page');
});

// inits ---

let refreshRateMs = 2 * 1000;
let refreshStopAfterMs = 30 * 1000;
const refresh = new refreshChatAreaLoop2(refreshRateMs, false, 50);

const myModal = new bootstrap.Modal(document.getElementById('myModal'));
const modalBtnsElem = document.querySelector('#modalBtns');
const modalNameInput = document.querySelector('#modalNameInput');
const modalApiKeyInput = document.querySelector('#modalApiKeyInput');

if (!localStorage.messangerData) {
    myModal.show();
} else {
    chatAreaInit();
    refresh.start();
    toggleDarkTheme(getStorageData().isDark);
    if (!isOnlineLastHour()) sendMessage(`${getStorageData().userName} is online`);
}

console.log('to see some interesting options type "/debug"');

// events2 ---
modalNameInput.addEventListener('keypress', event => { if (event.code === 'Enter') document.querySelector('#modalBtnOK').click(); });
modalApiKeyInput.addEventListener('keypress', event => { if (event.code === 'Enter') document.querySelector('#modalBtnOK').click(); });

modalBtnsElem.addEventListener('click', (e) => {

    let id = e.target.id;
    if (id == 'modalBtnOK' || id == 'modalBtnClose') {
        const userName = document.querySelector('#modalNameInput').value;
        const apiKey = document.querySelector('#modalApiKeyInput').value;

        if (!apiKey) {
            myModal.hide();
            showCustomMessage('client', `${apiKey} missing/invalid apiKey for access to mockapi.io, refresh page and enter api key again`);
            return;
        }

        userInfoInit(userName, apiKey);
        chatAreaInit();
        refresh.start();

        setStorageData(true, 'isAlwaysOnline');
        setStorageData('off', 'isDark');
        setStorageData(new Date().getTime(), 'isOnlineTimeStamp');

        myModal.hide();
        sendMessage(`new user "${getStorageData().userName}" has registered`);
    }
});

document.addEventListener('messangerEvent.isCode', (e) => {

    let [code, codeValue] = e.code.split('::');
    codeValue = codeValue ? codeValue.trim() : '';
    switch (code) {
        case '/rate':
            const [rate, stop] = codeValue.split(' ');
            const newRate = +rate * 1000;
            if (newRate < 0.25) return;
            const newStop = stop ? +stop * 1000 : false;
            refresh.update(newRate, newStop);
            break;

        case '/stop':
            refresh.update(1000, 100);
            break;

        case '/info':
            showUserInfo();
            break;

        case '/change':
            const [name, color] = codeValue.split('_');
            if (name) setStorageData(name.slice(0, 9), 'userName');
            if (color) setStorageData(color, 'userColor');
            showUserInfo();
            break;

        case '/del':
            if (Number.isInteger(+codeValue)) deleteMessages(false, +codeValue);
            showCustomMessage('client', 'you have been deleted some messages on server');
            break;

        case '/msg':

            if (!codeValue) return;

            let msgBody = JSON.parse(codeValue);

            if (Object.keys(msgBody).length == 0) return;

            Object.assign(msgBody, {
                isCustom: true,
                trueDate: new Date(),
                trueUserId: getStorageData().userId
            });

            sendMessage(msgBody, false, true);
            break;

        case '/saveHistory':

            const historyData = getStorageData().history;

            if (localStorage.hasOwnProperty('messangerHistoryBackUp')) {
                localStorage.setItem('messangerHistoryBackUp', JSON.stringify(historyData));
            } else {
                let prevHistoryArr = JSON.parse(localStorage.getItem('messangerHistoryBackUp'));
                let newHistoryArr = [...prevHistoryArr, historyData];
                localStorage.setItem('messangerHistoryBackUp', JSON.stringify(newHistoryArr));
            }

            showCustomMessage('client', 'history has been saved in localStorage.messangerHistoryBackUp');
            break;

        case '/baseUrl':
            setBaseUrl(codeValue);
            showCustomMessage('client', `new base url: ${getStorageData().baseUrl}`);
            break;

        case '/apiKey':
            setStorageData(codeValue, 'apiKey');
            showCustomMessage('client', `new api key: ${getStorageData().apiKey} was set for ${getStorageData().baseUrl}`);
            break;

        case '/debug':
            const debugElems = document.querySelectorAll('.debugElemHide');
            for (let elem of debugElems) {
                elem.classList.remove('debugElemHide');
            };
            break;

        default:
            return;
    }
});

document.addEventListener('messangerEvent.storageUpdated', e => {

    updateInfoString();

    if (Object.keys(e.prop)[0] == 'isDark') {
        toggleDarkTheme(e.prop.isDark);
    }
});