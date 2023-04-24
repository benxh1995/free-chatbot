# Free-Chatbot

## What is this?
A Chatbot interface that finds its own openAI keys and allows the user fast and easy acess to GPT-3.5 Turbo, and sometimes GPT-4

## How does it work?
The first, loading, or pre-loading step loads https://alwaysfindtheway.github.io/ and scrapes all the openAI proxies

The second step, the actual chatbot, uses the proxies to send requests to openAI

## Roadmap
- [x] Build a basic tailwind/react interface
- [x] Build the javascript scraper
- [x] Implement chatbot logic/code
- [x] Added markdown support for code highlighting
- [x] Implement interface for system prompt changing
- [x] Implement system prompt defaults
- [x] Implement settings modal
- [x] Settings modal should all list all API endpoints and their response speed in milliseconds (implemented with selection, in a table, without response speed, but with response status)
- [] ?Choose model in settings modal?

Optional:
- [x] Implement a way to save the chatbot's responses to local storage
- [x] Implement a name to "name" the conversations, and make a function to summarize the conversation to a title using the LLM
- [x] Implement a way to save the chatbot's responses to a file (to allow for a rapid creationg of datasets?)
- [-] Implement auto-modes for the creation of LLM instruction tuning datasets (should be handled in a different kind of app)
- [] Implement Langchain or AutoGPT for advanced functionality (e.g. plugins, browsing the internet, summarization of texts, and multi agents)

Either:
- [] Implement LangChain
- [] Implement Memory Module (summary of the conversation after n-turns, or/and after reaching x tokens in total, in order to lower the number of context tokens, and addittionaly, a special kind of "task list" memory)
- [] Implement "tool" use (e.g. summarization, browsing the internet, using code, using calculators, etc)
- [x] implement summarization for simulcra of long term memory (needs to handle updates of summarization after given message -- now just updates conversation, but cant re-summarize after token limit)

## How to use
```
git clone https://github.com/benxh1995/free-chatbot.git
cd free-chatbot
npm i
npm run dev
```

## How to build for production?
```
npm run build
```

## Found a bug?
Please open an issue on the github repo and I might decide to fix it if I have the spare time.

## Want an additional feature?
Please take care to open a github issue for the feature request you have. If I am not terribly inconvenienced, I will try add the feature. After considering it, and if I decide to add it, I will add it to the roadmap.