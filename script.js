// simple messanger v1.0 (03 Nov 2022)
// all back-end on mockapi.io server

// server should return object messageObj with props:
// messageObj.items - messages array
// messageObj.count - server prop of total number of messages on server (integer)

// example of messageObj.items item on server:
// {
//     date: "2022-11-01T22:59:39.798Z",    // new Date() from client
//     id: "6",                             // mockapi.io server prop (should't send from client)
//     userColor: "hwb(260deg 0% 25%)",
//     userId: 724525,
//     userMessage: "hello!",
//     userName: "chrome1",

//     isCustom: false,
//     trueDate: new Date(),
//     trueUserId: 724525
// }

// url                         https://mockapi.io/api/v1/messageObj
// with api key (example)      https://588c0242ec0215be123e7dee.mockapi.io/api/v1/messageObj

const sendButton = document.querySelector('#sendBtn');
const chatArea = document.querySelector('#chatTextArea');
const msgInput = document.querySelector('#messageInput');

const setBaseUrl = baseUrl => {
    setStorageData(baseUrl, 'baseUrl');
};

const getBaseUrl = () => {

    if( getStorageData().hasOwnProperty('apiKey') ) {
        const apiKey = getStorageData().apiKey; 
        if(apiKey) {
            let baseUrlWithApiKey = new URL( getStorageData().baseUrl );
            baseUrlWithApiKey.host = `${apiKey}.` + baseUrlWithApiKey.host;
            return baseUrlWithApiKey;
        } else {
            showCustomMessage('client', 'missing apiKey for access to mockapi.io, set manually using /api (see debug options)');
            return false;
        }
    }

    return getStorageData().baseUrl;
};

const userInfoInit = (name, apiKey) => {
    if ( localStorage.messangerData ) return getStorageData();

    setStorageData( setNameAndId(name) );
    setBaseUrl('https://mockapi.io/api/v1/messageObj');
    setStorageData( apiKey, 'apiKey' );
    setStorageData( false, 'history' );
};

const setNameAndId = (name) => {
    const randNum = Math.trunc(Math.random() * 1000000);
    
    let newName = name ? name.slice(0,9) : 'user' + randNum;
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
    return JSON.parse( localStorage.getItem('messangerData') );
};

const sendMessage = (msg, isServiceMsg, isCustomMessage) => {
    const message = msg;
    clearInput();

    if(isSpecCode(message)) return;

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
    
    if(isCustomMessage) {
        messageBody = msg; // custom message body must be Object
    }
    
    const baseUrl = getBaseUrl();                                            
    fetch(baseUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify( messageBody )
    })
    .then((response) => {
        if(response.status == 413) {
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
    
    let messagesIds = [ messagesArr[1].id ];                //exclude fist service msg 
    if(!onlyOne) {
        messagesIds = messagesArr.map( msg => msg.id );
        messagesIds.shift();                                //exclude fist service msg 
    }
    if(!onlyOne && +amount < messagesOnServer) {
        messagesIds = messagesIds.filter( (msgId, i) => i < +amount );
    }

    try {
        for ( let id of messagesIds ) {
            await new Promise( r => setTimeout(r, 300) );
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

        if(resp.ok) {

            let messages = await resp.json();
            let msgsArrCurrent = messages.items;
            let msgsArrPrev = getStorageData().messagesArr;

            if(msgsArrCurrent.length > msgsArrPrev.length) {
                
                setStorageData(msgsArrCurrent, 'messagesArr');
                
                msgsArrCurrent.splice(0, msgsArrPrev.length);
                
                for(let msg of msgsArrCurrent) {
                    if (msg !== undefined) showMessage(msg);
                    setStorageData(++curentMsgsAmount, 'messagesCounter');
                    setStorageData( [...getStorageData().history, msg] , 'history');
                }
            }
        }
    } catch (error) {
        console.log(error);
        setStorageData('error', 'isOnline');
        showCustomMessage('server', 'server error: ' + error);
    }
}

const chatAreaInit = () => {
    
    if ( !localStorage.messangerData ) return;
    
    const baseUrl = getBaseUrl();
    fetch(baseUrl)
        .then(response => {

            if(!response.ok) {
                throw new Error(response.status + ' status error');
            }

            if(response.status !== 200) {
                chatAreaInit();
                return;
            }

            return response.json();
        })
        .then(allMessages => {
            
            clearChatArea();

            const allMessagesItems = allMessages.items;

            if( !getStorageData().history ) setStorageData(allMessagesItems, 'history');
            
            if( allMessagesItems.length ) {

                let lastMsgNumber = Number.parseInt( allMessagesItems[allMessagesItems.length - 1].id );
                if(lastMsgNumber) setStorageData(lastMsgNumber, 'messagesCounter');

                setStorageData(+allMessagesItems[0].id, 'msgIdToDelete');
                
                setStorageData(allMessagesItems, 'messagesArr');
                for( let msg of allMessagesItems ) {
                    showMessage(msg);
                }

            } else {
                sendMessage('server is online', true);
                setStorageData(1, 'messagesCounter');
                setStorageData([], 'messagesArr');
            }                    
        })
        .catch( error => {
            console.log(error);
            setStorageData('error', 'isOnline');
            showCustomMessage('server', 'server error: ' + error);
        } );
}

const dateFormating = dateObj => {
    const today = new Date();
    const date = new Date(dateObj);
    const prevWeek = new Date(today.setDate( today.getDate() - 7 ));

    let [ month1, day, hourMin] = date.toLocaleString('en-GB', { 
        month: 'short',
        weekday: 'short', 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    }).split(' ');

    if( date.getDay() == today.getDay() ) day = '';
    if( date < prevWeek ) day = date.toLocaleString('en-GB', { day: '2-digit' });
    if( date.getMonth() == today.getMonth() ) month1 = '';
    if( date.getMinutes() !== today.getMinutes() ) hourMin = hourMin.slice(0,5);
    if( date.getFullYear() < today.getFullYear() ) hourMin = `${hourMin} ${date.getFullYear()}`;

    return { monthStr: month1, dayStr: day.slice(0,3), hourMinStr: hourMin};
};

const showMessage = (msg, isDebug, customStyle) => {
    if(!msg) return;
    
    const italic = isDebug ? 'fst-italic' : '';
    const { userName, userMessage, userColor, date, isCustom } = msg;
    
    const dateStr = dateFormating(date);

    const isCustomBadge = isCustom ? `<span class="badge text-bg-warning">custom</span>` : '';
    const newStyle = customStyle ? customStyle : '';
    
    chatArea.innerHTML += `
    <div class="row messageRow ${italic}" style="color: ${userColor};${newStyle}">
        <div class="col-1 fw-semibold">${userName}:</div>
        <div class="col">${isCustomBadge} ${userMessage}</div>
        <div class="col-1 fw-light text-end">${dateStr.dayStr} ${dateStr.monthStr}</div>
        <div class="col-1 fw-light text-start">${dateStr.hourMinStr}</div>
    </div>
    `;

    chatArea.scrollTop = chatArea.scrollHeight;
};

const showCustomMessage = (type, msg, customStyle) => {
    const date = new Date();
    showMessage({
        userName: type || 'error', 
        userMessage: msg, 
        userColor: 'orange',
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

        if(serverMsgAmount > this.maxMsgsOnServer) deleteMessages(true);
    }

    checkAndDeleteMsgs() {
        const sec = new Date().getSeconds();
        const checkRate = 5;

        if(sec % checkRate == 0) this.deleteExtraMsgOnServer();
    }

    start(isUpdated) {

        if(this.intervalId) return;
        
        this.intervalId = setInterval(async () => {
            await getAndShowMessage2();
            this.checkAndDeleteMsgs();
        }, this.rateMs);

        if(this.stopAfter) {
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
        clearInterval( this.intervalId );
        this.intervalId = null;
        if (this.stopAfter && !isUpdated) showCustomMessage('client', 'refresh has been stopped');
        this.updateInfo(false);
    }

    update(rateMs1, stopAfter1) {
        if(rateMs1 && (stopAfter1 || stopAfter1 == 0)) {
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
    let { chatRefreshRateMs, chatStopRefreshAfterMs, messagesOnServerAmount  } = getStorageData();
    chatInfoElem.textContent = `refresh each: ${ chatRefreshRateMs / 1000 } sec.; ` +
                               `stop after: ${ chatStopRefreshAfterMs / 1000 } sec.; ` +
                               `messages on server: ${ messagesOnServerAmount } ` +
                               `(max: ${ refresh.maxMsgsOnServer })`;
    
    let onlineIndicator = document.querySelector('#isOnlineStatus');
    if(getStorageData().isOnline == 'error') {
        onlineIndicator.classList.replace('text-success', 'text-danger');
    }
    else if(getStorageData().isOnline) {
        onlineIndicator.style.cssText = '';
        onlineIndicator.classList.replace('text-danger', 'text-success');
    } else if(!getStorageData().isOnline) {
        onlineIndicator.style.cssText = 'display: none';
    }                         
};

const clearInput = () => {
    msgInput.value = '';
};

const setUserColorStyle = (id) => {
    const colorCode = Math.trunc(( id / 1000000 ) * 359);;
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
    for(let elemName of elemsToDark) {

        let elem = document.querySelector(elemName);

        if(state == 'on') {
            elem.classList.add('darkTheme');
            elem.classList.replace('btn-outline-primary', 'btn-outline-warning');
        }
        else if(state == 'off') {
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

// events ---
sendButton.addEventListener('click', () => sendMessage(msgInput.value));

const darkThemeBtn = document.querySelector('#darkThemeBtn');
darkThemeBtn.addEventListener('click', () => {
    let newValue = getStorageData().isDark == 'on' ? 'off' : 'on';
    setStorageData(newValue, 'isDark');
});

const historyBtn = document.querySelector('#historyBtn');
historyBtn.addEventListener('click', () => {
    showHistory();
});



msgInput.addEventListener('keypress', (event) => {
    if (event.code === 'Enter') sendMessage(msgInput.value);
});
document.querySelector('#clearCacheBtn').addEventListener('click', () => {
    
    localStorage.removeItem('messangerData');
    showCustomMessage('client', 'your username and data have been deleted in localStorage, reload this page');
});

// inits ---

let refreshRateMs = 1 * 1000;
let refreshStopAfterMs = 30 * 1000;
const refresh = new refreshChatAreaLoop2(refreshRateMs, false, 50);

const myModal = new bootstrap.Modal(document.getElementById('myModal'));
const modalBtnsElem = document.querySelector('#modalBtns');
const modalNameInput = document.querySelector('#modalNameInput');
const modalApiKeyInput = document.querySelector('#modalApiKeyInput');

if ( !localStorage.messangerData ) {
    myModal.show();
} else {
    chatAreaInit();
    refresh.start();
    toggleDarkTheme( getStorageData().isDark );
}

// events2 ---
modalNameInput.addEventListener('keypress', event => {if (event.code === 'Enter') document.querySelector('#modalBtnOK').click();});
modalApiKeyInput.addEventListener('keypress', event => {if (event.code === 'Enter') document.querySelector('#modalBtnOK').click();});

modalBtnsElem.addEventListener('click', (e) => {

    let id = e.target.id;
    if ( id == 'modalBtnOK' || id == 'modalBtnClose' ) {
        const userName = document.querySelector('#modalNameInput').value;
        const apiKey = document.querySelector('#modalApiKeyInput').value;

        if(!apiKey) {
            myModal.hide();
            showCustomMessage('client', 'apiKey wasn\'t set for access to mockapi.io');
            return;
        }

        userInfoInit(userName, apiKey);
        chatAreaInit();
        refresh.start();

        setStorageData(true, 'isAlwaysOnline');
        setStorageData('off', 'isDark');
     
        myModal.hide();
    }
});

document.addEventListener('messangerEvent.isCode', (e) => {

    let [code, codeValue] = e.code.split('::');
    codeValue = codeValue ? codeValue.trim() : '';
    switch (code) {
        case '/rate':
            const [rate, stop] = codeValue.split(' ');
            const newRate = +rate * 1000;
            if(newRate < 0.25) return;
            const newStop = stop ? +stop * 1000 : false;
            refresh.update(newRate, newStop);
            break;
        
        case '/stop':
            refresh.update(1000,100);
            break;
      
        case '/info':
            showUserInfo();
            break;

        case '/change':
            const [name, color] = codeValue.split(' ');
            if(name) setStorageData(name.slice(0, 9), 'userName');
            if(color) setStorageData(color, 'userColor');
            showUserInfo();
            break;
        
        case '/del':
            if(Number.isInteger(+codeValue)) deleteMessages(false, +codeValue);
            showCustomMessage('client', 'you have been deleted some messages on server');
            break;

        case '/msg':

            if( !codeValue ) return;
            
            let msgBody = JSON.parse( codeValue );
            
            if( Object.keys(msgBody).length == 0 ) return;
            
            Object.assign(msgBody, {
                isCustom: true,
                trueDate: new Date(),
                trueUserId: getStorageData().userId
            });

            sendMessage(msgBody, false, true);
            break;

        case '/saveHistory':

            const historyData = getStorageData().history;

            if ( localStorage.hasOwnProperty('messangerHistoryBackUp') ) {
                localStorage.setItem( 'messangerHistoryBackUp', JSON.stringify(historyData) );
            } else {
                let prevHistoryArr = JSON.parse( localStorage.getItem( 'messangerHistoryBackUp' ) );
                let newHistoryArr = [...prevHistoryArr, historyData];
                localStorage.setItem( 'messangerHistoryBackUp', JSON.stringify(newHistoryArr) );
            }

            showCustomMessage('client', 'history has been saved in localStorage.messangerHistoryBackUp');
            break;

        case '/baseUrl':
            setBaseUrl(codeValue);
            showCustomMessage('client', `new base url: ${getStorageData().baseUrl}`);
            break;

        case '/apiKey':
            setStorageData(codeValue, 'apiKey');
            showCustomMessage('client', `new api key: ${getStorageData().apiKey} for ${getStorageData().baseUrl}`);
            break;

        default:
            return;
      }
});

document.addEventListener('messangerEvent.storageUpdated', e => {
   
    updateInfoString();
    
    if( Object.keys(e.prop)[0] == 'isDark' ) {
        toggleDarkTheme(e.prop.isDark);
    }
});