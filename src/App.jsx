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
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(
    localStorage.getItem("settings") || {}
  );

  const [globalMessages, setGlobalMessages] = useState([
    {
      role: "system",
      content:
        "You are a very helpful artificial intelligence which aids users in whichever task they require. You take great care not to reject their requests, and answer truthfully and in concise terms based on their requests.",
    },
  ]);

  // hardcoded data for now
  const modelName = "gpt-3.5-turbo";
  const system =
    "You are a very helpful artificial intelligence which aids users in whichever task they require. You take great care not to reject their requests, and answer truthfully and in concise terms based on their requests.";

  // The first, loading, or pre-loading step loads https://alwaysfindtheway.github.io/ and scrapes all the openAI proxies
  const fetchProxies = async () => {
    const response = await axios.get("https://alwaysfindtheway.github.io/");

    let text = response.data;
    // isolate each iframe from text
    const iframes = text.match(/<iframe.*?src="(.*?)".*?>/g);
    const iframeSrcs = iframes.map((iframe) => iframe.match(/src="(.*?)"/)[1]);

    // add /proxy/openai to each iframe if src ends with /, else add /proxy/openai
    const proxySrcs = iframeSrcs.map((src) =>
      src.endsWith("/") ? src + "proxy/openai/v1" : src + "/proxy/openai/v1"
    );

    return proxySrcs;
  };

  const continueCompletion = async (message) => {
    setNotStarted(false);
    setLoading(true);
    // first get whole message history
    let messageHistory = globalMessages;
    // then add new message to message history
    messageHistory.push({
      role: "user",
      content: message,
    });
    setGlobalMessages(messageHistory.slice(0));
    // then send POST request to proxies[3]
    let postRequest = await axios
      .post(settings.proxies[3] + "/chat/completions", {
        model: modelName,
        messages: messageHistory,
      })
      .then((response) => {
        // append this to globalMessages : response.data.choices[0].message
        messageHistory.push({
          role: "assistant",
          content: response.data.choices[0].message.content,
        });
        console.log(messageHistory);
        setGlobalMessages(messageHistory.slice(0));
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProxies().then((proxies) => {
      setSettings({ ...settings, proxies });
    });
  }, []);

  // The second step is to load the proxy list into the settings

  return (
    <>
      <div className="w-full bg-slate-500 min-h-12 py-4">
        <div className="flex justify-between items-center h-full">
          <div className="flex items-center">
            <h1 className="text-white text-2xl ml-4">Chatbot interface</h1>
          </div>
          <div className="flex items-center">
            <button
              className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded mr-4"
              onClick={() => setOpenSettings(!openSettings)}
            >
              Settings
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse  md:flex-row">
        <div className="w-full md:w-3/12 bg-zinc-400 h-full">
          Coming soon - saved chats
        </div>

        <div className="w-full md:w-9/12 bg-slate-200 h-full">
          {globalMessages.map((message, index) => {
            return (
              <div
                key={index}
                className={`m-2 md:m-4 p-2 md:p-4 border border-slate-900 ${
                  message.role === "system" ? "bg-cyan-100" : 
                  message.role === "assistant" ? "bg-yellow-100" :
                  "bg-slate-100"
                }`}
              >
                {message.role === "system" && notStarted === true ? (
                  <i>[editable]</i>
                ) : (
                  ""
                )}{" "}
                <br />
                {message.role === "assistant" ? (
                  <b>Assistant:</b>
                ) : message.role === "user" ? (
                  <b>You:</b>
                ) : (
                  <b>System:</b>
                )}
                {/* if editable, double click to edit message.content */}
                {message.role === "system" && notStarted === true ? (
                  <>
                    <p
                      onDoubleClick={(e) => {
                        e.target.contentEditable = true;
                      }}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && e.target.contentEditable) {
                          // update globalMessages
                          let messageHistory = globalMessages;
                          messageHistory[index].content = e.target.innerText;
                          setGlobalMessages(messageHistory.slice(0));
                          e.target.contentEditable = false;
                        }
                      }}
                    >
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
            <div className="m-2 md:m-4 p-2 md:p-4 border border-slate-900 bg-yellow-100">
              <b>Assistant:</b> <i>Thinking...</i>
            </div>
              )}
        </div>
      </div>

      <div className="w-full bg-slate-200 min-h-12 p-4">
        <input
          className="w-full h-12 p-4"
          placeholder="Type your message here"
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              continueCompletion(e.target.value);
              e.target.value = "";
            }
          }}
        />
      </div>
    </>
  );
}

export default App;
