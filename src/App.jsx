import { useEffect, useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import axios from "axios";
import rehypeHighlight from "rehype-highlight/lib";
import "./App.css";
import { ReactMarkdown } from "react-markdown/lib/react-markdown";

function App() {
    const [openSettings, setOpenSettings] = useState(false);
    const [notStarted, setNotStarted] = useState(true);
    const [initLoading, setInitLoading] = useState(true);
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState({});
    const [typedMessage, setTypedMessage] = useState("");
    const [savedChats, setSavedChats] = useState([]);
    const [activeChatID, setActiveChatID] = useState(null);
    const [assignedProxy, setAssignedProxy] = useState(null);
    const [globalMessages, setGlobalMessages] = useState([
        {
            role: "system",
            content:
                "You are a very helpful artificial intelligence which aids users in whichever task they require. You take great care not to reject their requests, and answer truthfully and in concise terms based on their requests.",
        },
    ]);

    // hardcoded data for now
    const modelName = "gpt-3.5-turbo";

    // The first, loading, or pre-loading step loads https://alwaysfindtheway.github.io/ and scrapes all the openAI proxies
    const fetchProxies = async () => {
        const response = await axios.get("https://alwaysfindtheway.github.io/");

        let text = response.data;
        // isolate each iframe from text
        const iframes = text.match(/<iframe.*?src="(.*?)".*?>/g);
        const iframeSrcs = iframes.map(
            (iframe) => iframe.match(/src="(.*?)"/)[1]
        );

        // add /proxy/openai to each iframe if src ends with /, else add /proxy/openai
        const proxySrcs = iframeSrcs.map((src) =>
            src.endsWith("/")
                ? src + "proxy/openai/v1"
                : src + "/proxy/openai/v1"
        );

        let allProxies = [];
        for (let i = 0; i < proxySrcs.length; i++) {
            let proxyObj = {};
            let proxy = proxySrcs[i];
            let status = await axios
                .get(proxy + "/models")
                .then((response) => {
                    if (assignedProxy === null) {
                        setAssignedProxy({
                            proxy: proxy,
                            status: response.status,
                        });
                    }
                    return response.status;
                })
                .catch((error) => {
                    return error.response.status;
                });
            proxyObj.proxy = await proxy;
            proxyObj.status = await status;

            allProxies.push(proxyObj);
        }

        return allProxies;
    };

    const generateName = async(messagesObj) =>{
       let messageCpy = Object.assign([], messagesObj);
        messageCpy.push({
            role: "user",
            content: "Generate a name for this chat, max. 4 words",
        });
        let name = await axios
            .post(assignedProxy.proxy + "/chat/completions", {
                model: modelName,
                messages: messageCpy,
            })
            .then((response) => {
                return response.data.choices[0].message.content;
            })
            .catch((error) => {
                return "Error";
            });
        return name;
    }

    const continueCompletion = async (message) => {
        // if activated uuid is null, create new chat
        let activatedUUID = notStarted
            ? null
            : activeChatID === null
            ? null
            : savedChats.find((chat) => chat.uuid === activeChatID).uuid;
        // initialize empty chat
        if (activatedUUID === null) {
            let chatObj = {
                uuid: URL.createObjectURL(new Blob()).substr(-36),
                messages: globalMessages,
            };
            setActiveChatID(chatObj.uuid);
            activatedUUID = chatObj.uuid;
            setSavedChats([...savedChats, chatObj]);
            localStorage.setItem(
                "savedChats",
                JSON.stringify([...savedChats, chatObj])
            );
        }

        // set globals for hiding suggestions and starting "thinking part"
        setNotStarted(false);
        setLoading(true);

        // first get whole message history and append new message
        let messageHistory = globalMessages;
        messageHistory.push({
            role: "user",
            content: message,
        });
        setGlobalMessages(messageHistory.slice(0));

        // update savedChat messages with messageHistory where uuid === activatedUUID
        let activeChat = savedChats.find((chat) => chat.uuid === activatedUUID);
        if (activeChat === undefined) {
            activeChat = {
                uuid: activatedUUID,
                messages: messageHistory,
            };
        }

        let assignedSavedChats = Object.assign([], savedChats);
        let index = assignedSavedChats.findIndex(
            (chat) => chat.uuid === activatedUUID
        );

        if (index === -1) {
            assignedSavedChats.push(activeChat);
        } else {
            assignedSavedChats[index] = activeChat;
        }
        setSavedChats(assignedSavedChats);

        localStorage.setItem("savedChats", JSON.stringify(assignedSavedChats));
        if(activeChat.name === undefined){
            let name = await generateName(messageHistory);
            activeChat.name = name;
            assignedSavedChats[index] = activeChat;
            setSavedChats(assignedSavedChats);
            localStorage.setItem("savedChats", JSON.stringify(assignedSavedChats));
        }
        // then send POST request to proxies[3]
        let postRequest = await axios
            .post(assignedProxy.proxy + "/chat/completions", {
                model: modelName,
                messages: messageHistory,
            })
            .then((response) => {
                // append this to globalMessages : response.data.choices[0].message
                messageHistory.push({
                    role: "assistant",
                    content: response.data.choices[0].message.content,
                });
                setGlobalMessages(messageHistory.slice(0));

                //update savedChat messages

                let activeChat = savedChats.find(
                    (chat) => chat.uuid === activatedUUID
                );
                if (activeChat === undefined) {
                    activeChat = {
                        uuid: activatedUUID,
                        messages: [],
                    };
                }
                activeChat.messages = messageHistory;

                let assignedSavedChats = Object.assign([], savedChats);
                let index = assignedSavedChats.findIndex(
                    (chat) => chat.uuid === activatedUUID
                );

                if (index === -1) {
                    assignedSavedChats.push(activeChat);
                } else {
                    assignedSavedChats[index] = activeChat;
                }
                setSavedChats(assignedSavedChats);

                localStorage.setItem(
                    "savedChats",
                    JSON.stringify(assignedSavedChats)
                );
            })
            .finally(() => {
                setLoading(false);
            });
    };

    useEffect(() => {
        // load saved chats from local storage
        let savedChats = JSON.parse(localStorage.getItem("savedChats"));
        if (savedChats) {
            setSavedChats(savedChats);
        }

        fetchProxies().then((proxies) => {
            setSettings({ ...settings, proxies });
            setInitLoading(false);
        });
    }, []);

    // The second step is to load the proxy list into the settings

    return (
        <>
            <div
                className={`relative z-10 ${openSettings ? "block" : "hidden"}`}
                role="dialog"
                aria-modal="true">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <div className="relative transform overflow-hidden rounded-md bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg md:max-w-2xl">
                            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4 overflow-x-scroll">
                                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left overflow-x-scroll">
                                    <h3 className="text-base font-semibold leading-6 text-gray-900">
                                        Settings
                                    </h3>
                                    <div className="mt-2 overflow-x-scroll">
                                        <table className="table-fixed overflow-x-scroll">
                                            <thead>
                                                <tr>
                                                    <th className="px-4 py-2">
                                                        Select
                                                    </th>
                                                    <th className="px-4 py-2">
                                                        Proxy
                                                    </th>
                                                    <th className="px-4 py-2">
                                                        Returned
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {settings &&
                                                    settings?.proxies &&
                                                    initLoading === false &&
                                                    settings.proxies?.map(
                                                        (proxy, index) => (
                                                            <tr key={index}>
                                                                <td
                                                                    className="px-4 py-2 cursor-pointer"
                                                                    onClick={() => {
                                                                        if (
                                                                            proxy.status ===
                                                                                200 &&
                                                                            assignedProxy?.proxy !==
                                                                                proxy.proxy
                                                                        ) {
                                                                            setAssignedProxy(
                                                                                {
                                                                                    proxy: proxy.proxy,
                                                                                    status: proxy.status,
                                                                                }
                                                                            );
                                                                        }
                                                                    }}>
                                                                    {assignedProxy?.proxy ===
                                                                    proxy.proxy ? (
                                                                        <svg
                                                                            xmlns="http://www.w3.org/2000/svg"
                                                                            className="h-6 w-6 stroke-lime-500 hover:stroke-lime-800"
                                                                            fill="none"
                                                                            viewBox="0 0 24 24">
                                                                            <path
                                                                                strokeLinecap="round"
                                                                                strokeLinejoin="round"
                                                                                strokeWidth={
                                                                                    2
                                                                                }
                                                                                d="M5 13l4 4L19 7"
                                                                            />
                                                                        </svg>
                                                                    ) : (
                                                                        <svg
                                                                            xmlns="http://www.w3.org/2000/svg"
                                                                            className={`h-6 w-6 ${
                                                                                proxy.status ===
                                                                                200
                                                                                    ? "stroke-slate-950 hover:stroke-slate-500"
                                                                                    : "stroke-red-500 hover:stroke-red-800"
                                                                            }`}
                                                                            fill="none"
                                                                            viewBox="0 0 24 24">
                                                                            <path
                                                                                strokeLinecap="round"
                                                                                strokeLinejoin="round"
                                                                                strokeWidth={
                                                                                    2
                                                                                }
                                                                                d="M6 18L18 6M6 6l12 12"
                                                                            />
                                                                        </svg>
                                                                    )}
                                                                </td>
                                                                <td className="text-sm">
                                                                    {
                                                                        proxy.proxy
                                                                    }
                                                                </td>
                                                                <td className="text-sm">
                                                                    {proxy.status.toString()}
                                                                </td>
                                                            </tr>
                                                        )
                                                    )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:px-6">
                                <button
                                    type="button"
                                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                                    onClick={() =>
                                        setOpenSettings(!openSettings)
                                    }>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="w-full bg-main min-h-12 py-4 sticky top-0">
                <div className="flex justify-between items-center h-full">
                    <div className="flex items-center">
                        <h1 className="text-white text-2xl ml-4">
                            Chatbot interface
                        </h1>
                    </div>
                    <div className="flex items-center">
                        <button
                            className="bg-btn text-white font-bold py-2 px-4 rounded-md mr-4"
                            onClick={() => setOpenSettings(!openSettings)}>
                            Settings
                        </button>

                        <button
                            className="bg-btn text-white font-bold py-2 px-4 rounded-md mr-4"
                            onClick={() => {
                                setActiveChatID(null);
                                setGlobalMessages([
                                    {
                                        role: "system",
                                        content:
                                            "You are a very helpful artificial intelligence which aids users in whichever task they require. You take great care not to reject their requests, and answer truthfully and in concise terms based on their requests.",
                                    },
                                ]);
                                setInitLoading(true);
                                setNotStarted(true);
                            }}>
                            New chat
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-col-reverse md:flex-row min-h-screen h-full">
                <div className="w-full md:w-3/12 bg-secondary text-white p-4 h-screen min-h-full overflow-y-scroll">
                    {savedChats.length > 0 ? (
                        <>
                            <div className="flex flex-col items-center justify-center mt-8 mx-4 mb-6">
                                <div className="flex flex-col items-center justify-center">
                                    <h1 className="text-2xl font-bold text-white">
                                        Saved chats
                                    </h1>
                                    <p className="text-white">
                                        Click on a chat to view it
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col items-center justify-center mt-8 mx-4 mb-6">
                                {savedChats.map((chat, index) => (
                                    <div
                                        key={index}
                                        className={`flex flex-row justify-between w-full mb-4 p-4 rounded-md cursor-pointer border-white border`}
                                        onClick={() => {
                                            setNotStarted(false);
                                            setActiveChatID(chat.uuid);
                                            // load chat messages from localstorage into state
                                            let parsedMSGS = JSON.parse(
                                                localStorage.getItem(
                                                    "savedChats"
                                                )
                                            ).find((findChat) => {
                                                return (
                                                    findChat.uuid === chat.uuid
                                                );
                                            }).messages;

                                            setGlobalMessages(parsedMSGS);
                                        }}>
                                          <div className="flex flex-col">
                                        <h1 className="text-md font-bold text-white">
                                          {chat.name ? chat.name : chat.uuid}
                                        </h1>
                                        <p className="text-white text-sm">
                                            {chat.messages.length -1} messages
                                        </p>
                                        </div>
                                        <div className="flex flex-row items-center justify-center">
                                          <button className="bg-btn text-xs py-2 px-4 rounded-md mr-4 mt-4" onClick={() => {
                                              let parsedMSGS = JSON.parse(
                                                localStorage.getItem(
                                                    "savedChats"
                                                )
                                            ).find((findChat) => {
                                                return (
                                                    findChat.uuid === chat.uuid
                                                );
                                            }).messages;
                                            let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(parsedMSGS));
                                            let downloadAnchorNode = document.createElement('a');
                                            downloadAnchorNode.setAttribute("href",     dataStr);
                                            downloadAnchorNode.setAttribute("download", chat.name + ".json");
                                            document.body.appendChild(downloadAnchorNode); // required for firefox
                                            downloadAnchorNode.click();
                                            downloadAnchorNode.remove();
                                          }}>
                                            ⬇️
                                          </button>

                                          <button className="bg-btn  text-xs py-2 px-4 rounded-md mr-4 mt-4" onClick={() => {
                                            let parsedMSGS = JSON.parse(
                                                localStorage.getItem(
                                                    "savedChats"
                                                ) 
                                            ).filter((findChat) => {

                                                return (
                                                    findChat.uuid !== chat.uuid
                                                );
                                            });
                                            localStorage.setItem("savedChats", JSON.stringify(parsedMSGS));
                                            setSavedChats(parsedMSGS);
                                          }}>
                                            ❌
                                          </button>
                                          </div>
                                    </div>
                                ))}

                                <div className="flex flex-row justify-between w-full mb-4 p-4 rounded-md cursor-pointer border-white border">
                                    <button className="bg-btn text-white font-bold py-2 px-4 rounded-md mr-4" onClick={() => {
                                        let parsedMSGS = JSON.parse(
                                            localStorage.getItem(
                                                "savedChats"
                                            )
                                        );
                                        let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(parsedMSGS));
                                        let downloadAnchorNode = document.createElement('a');
                                        downloadAnchorNode.setAttribute("href",     dataStr);
                                        downloadAnchorNode.setAttribute("download", "savedChats.json");
                                        document.body.appendChild(downloadAnchorNode); // required for firefox
                                        downloadAnchorNode.click();
                                        downloadAnchorNode.remove();
                                    }}>
                                        ⬇️ all chats
                                    </button>
                                    <button className="bg-btn text-white font-bold py-2 px-4 rounded-md mr-4" onClick={() => {
                                        localStorage.setItem("savedChats", JSON.stringify([]));
                                        setSavedChats([]);
                                    }}>
                                        ❌ all chats
                                    </button>
                                    </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center mt-8 mx-4 mb-6">
                            <div className="flex flex-col items-center justify-center">
                                <h1 className="text-2xl font-bold text-white">
                                    No saved chats
                                </h1>
                                <p className="text-white">
                                    Start a chat to view it listed here
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="w-full md:w-9/12 bg-slate-200 h-screen min-h-full overflow-y-scroll">
                    {notStarted === true ? (
                        <>
                            <div className="flex flex-col items-center justify-center mt-8 mx-4 mb-6">
                                <div className="flex flex-col items-center justify-center">
                                    <h1 className="text-2xl font-bold text-slate-900">
                                        Start a conversation
                                    </h1>
                                    <p className="text-slate-900">
                                        Choose a preset, or edit the system
                                        prompt
                                    </p>
                                </div>
                            </div>
                            <div className="w-full justify-around p-4">
                                <div className="grid grid-cols-5 gap-x-4 gap-y-4">
                                    <div
                                        className="border border-stone-700 rounded-md p-2 cursor-pointer"
                                        onClick={() => {
                                            setGlobalMessages([
                                                {
                                                    role: "system",
                                                    content:
                                                        "You are a professional programmer companion AI. You will follow user requests in order to prepare various programming and coding tasks for the user. You will separate each function in its own code block when returning it to the user, and you will closely follow users instructions for coding and preparing code. You may be asked by users to provide algorithms or solutions to technical problems. You will advise the user as well as prepare boilerplate code for the user when asked do to so. Generally, you will prepare code, and only offer comments if asked to do so.",
                                                },
                                            ]);
                                        }}>
                                        Programmer Companion <br />
                                        <i className="text-xs">
                                            You are a professional programmer
                                            companion AI. You will follow user
                                            requests in order to prepare various
                                            programming and coding tasks for the
                                            user. You will separate each
                                            function in its own code block when
                                            returning it to the user, and you
                                            will closely follow users
                                            instructions for coding and
                                            preparing code. You may be asked by
                                            users to provide algorithms or
                                            solutions to technical problems. You
                                            will advise the user as well as
                                            prepare boilerplate code for the
                                            user when asked do to so. Generally,
                                            you will prepare code, and only
                                            offer comments if asked to do so.
                                        </i>
                                    </div>
                                    <div
                                        className="border border-stone-700 rounded-md p-2 cursor-pointer"
                                        onClick={() => {
                                            setGlobalMessages([
                                                {
                                                    role: "system",
                                                    content:
                                                        "You are a professional Solidity Auditing AI. You Audit the smart contracts and functions in solidity that the users will send. For all input information from the user, you will do your best to  provide a security and best-practices audit that will be as useful as possible. Give lots of examples and explanations why some course of action is better.",
                                                },
                                            ]);
                                        }}>
                                        Solidity Auditor <br />
                                        <i className="text-xs">
                                            You are a professional Solidity
                                            Auditing AI. You Audit the smart
                                            contracts and functions in solidity
                                            that the users will send. For all
                                            input information from the user, you
                                            will do your best to provide a
                                            security and best-practices audit
                                            that will be as useful as possible.
                                            Give lots of examples and
                                            explanations why some course of
                                            action is better.
                                        </i>
                                    </div>
                                    <div
                                        className="border border-stone-700 rounded-md p-2 cursor-pointer"
                                        onClick={() => {
                                            setGlobalMessages([
                                                {
                                                    role: "system",
                                                    content:
                                                        "You are a professional screenwriting AI. You will follow the instructions based on the requests of the user, and will follow the specific themes required. For all input information from the user, you will do your best to provide a screenplay that is as close to the user's request as possible.",
                                                },
                                            ]);
                                        }}>
                                        Screenwriting AI <br />
                                        <i className="text-xs">
                                            You are a professional screenwriting
                                            AI. You will follow the instructions
                                            based on the requests of the user,
                                            and will follow the specific themes
                                            required. For all input information
                                            from the user, you will do your best
                                            to provide a screenplay that is as
                                            close to the user's request as
                                            possible.
                                        </i>
                                    </div>
                                    <div
                                        className="border border-stone-700 rounded-md p-2 cursor-pointer"
                                        onClick={() => {
                                            setGlobalMessages([
                                                {
                                                    role: "system",
                                                    content:
                                                        "You are a highly capable AI that writes personal and professional communication.  You will follow the instructions based on the requests of the user, and write emails,  in the tone, cadence and style requested by the user. If the user doesn't specify a style,  you will use your best judgement to write the email in a way that is appropriate for the situation.",
                                                },
                                            ]);
                                        }}>
                                        E-mail AI <br />
                                        <i className="text-xs">
                                            You are a highly capable AI that
                                            writes personal and professional
                                            communication. You will follow the
                                            instructions based on the requests
                                            of the user, and write emails, in
                                            the tone, cadence and style
                                            requested by the user. If the user
                                            doesn't specify a style, you will
                                            use your best judgement to write the
                                            email in a way that is appropriate
                                            for the situation.
                                        </i>
                                    </div>
                                    <div
                                        className="border border-stone-700 rounded-md p-2 cursor-pointer"
                                        onClick={() => {
                                            setGlobalMessages([
                                                {
                                                    role: "system",
                                                    content:
                                                        "You are a social media description copywriting AI. You will follow the instructions based on brand, and wording of the posts that need description. For each post you are asked for, you will provide short or long descriptions based on user request. Additionally also provide versions of the descriptions translated into Italian.",
                                                },
                                            ]);
                                        }}>
                                        Social Media Italian <br />
                                        <i className="text-xs">
                                            You are a social media description
                                            copywriting AI. You will follow the
                                            instructions based on brand, and
                                            wording of the posts that need
                                            description. For each post you are
                                            asked for, you will provide short or
                                            long descriptions based on user
                                            request. Additionally also provide
                                            versions of the descriptions
                                            translated into Italian.
                                        </i>
                                    </div>
                                    <div
                                        className="border border-stone-700 rounded-md p-2 cursor-pointer"
                                        onClick={() => {
                                            setGlobalMessages([
                                                {
                                                    role: "system",
                                                    content:
                                                        "You are an AI that helps in business processes. You will assist the user in writing business proposals, and other documents as requested, please keep commentary to the bare minimum needed.",
                                                },
                                            ]);
                                        }}>
                                        Business process <br />
                                        <i className="text-xs">
                                            You are an AI that helps in business
                                            processes. You will assist the user
                                            in writing business proposals, and
                                            other documents as requested, please
                                            keep commentary to the bare minimum
                                            needed.
                                        </i>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        ""
                    )}

                    {globalMessages.map((message, index) => {
                        return (
                            <div
                                key={index}
                                className={`rounded-md m-2 md:m-4 p-2 md:p-4 border border-slate-900 ${
                                    message.role === "system"
                                        ? "bg-cyan-100"
                                        : message.role === "assistant"
                                        ? "bg-yellow-100"
                                        : "bg-slate-100"
                                }`}>
                                {message.role === "system" &&
                                notStarted === true ? (
                                    <>
                                        <i>[editable]</i>
                                        <br />
                                    </>
                                ) : (
                                    ""
                                )}{" "}
                                {message.role === "assistant" ? (
                                    <b>Assistant:</b>
                                ) : message.role === "user" ? (
                                    <b>You:</b>
                                ) : (
                                    <b>System:</b>
                                )}
                                {/* if editable, double click to edit message.content */}
                                {message.role === "system" &&
                                notStarted === true ? (
                                    <>
                                        <p
                                            onDoubleClick={(e) => {
                                                e.target.contentEditable = true;
                                            }}
                                            onKeyPress={(e) => {
                                                if (
                                                    e.key === "Enter" &&
                                                    e.target.contentEditable
                                                ) {
                                                    // update globalMessages
                                                    let messageHistory =
                                                        globalMessages;
                                                    messageHistory[
                                                        index
                                                    ].content =
                                                        e.target.innerText;
                                                    setGlobalMessages(
                                                        messageHistory.slice(0)
                                                    );
                                                    e.target.contentEditable = false;
                                                }
                                            }}>
                                            {message.content}
                                        </p>
                                    </>
                                ) : (
                                    <ReactMarkdown
                                        children={message.content}
                                        rehypePlugins={[rehypeHighlight]}
                                    />
                                )}
                            </div>
                        );
                    })}
                    {loading && (
                        <div className="m-2 md:m-4 p-2 md:p-4 border border-slate-900 bg-yellow-100 rounded-md">
                            <b>Assistant:</b> <i>Thinking...</i>
                        </div>
                    )}
                </div>
            </div>
            {/* div that sticks to bottom */}
            <div className="w-full bg-slate-200 min-h-12 p-4 sticky bottom-0 flex">
                <input
                    className="w-full h-12 p-4 rounded-md"
                    placeholder="Type your message here"
                    onChange={(e) => {
                        setTypedMessage(e.target.value);
                    }}
                    onKeyPress={(e) => {
                        if (e.key === "Enter") {
                            continueCompletion(e.target.value);
                            e.target.value = "";
                        }
                    }}
                />
                <button
                    className="bg-btn text-white font-bold py-2 px-4 rounded-md ml-4"
                    onClick={() => continueCompletion(typedMessage)}>
                    Send
                </button>
            </div>
        </>
    );
}

export default App;
