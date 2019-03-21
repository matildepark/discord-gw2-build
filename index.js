/* eslint-disable no-console */
require('dotenv').config();

const Discord = require('discord.js');
const client = new Discord.Client();
const axios = require('axios');
const fs = require('fs');
var api = JSON.parse(fs.readFileSync('./apis.json', 'utf8'));

let apiCall = "";
let characterLink = "https://api.guildwars2.com/v2/characters/"

let traitLookupBase = "https://api.guildwars2.com/v2/traits/";
let specializationLookup = "https://api.guildwars2.com/v2/specializations/" 

let specializationResponse = {};

let loadApi = function(author) {
    author.send("Hey! You don't have an API key, silly! Paste it here, starting with !api [your key] and I'll add it in.");
}

let getBuild = async function (characterName) {
    let acctLookupUrl = characterLink + characterName + "/" + apiCall;
    let characterObject = await axios.get(acctLookupUrl);
    for (let x of characterObject.data.specializations.wvw) {
        specializationResponse[x.id] = x.traits;
        let specLook = specializationLookup + x.id;
        axios.get(specLook).then(res => {
            specializationResponse[res.data.name] = specializationResponse[x.id];
            delete specializationResponse[x.id];
        });
    }
    for (let [, value] of Object.entries(specializationResponse)) {
        await Promise.all(value.map(async function (element) {
            let traitLookupUrl = traitLookupBase + element;
            await axios.get(traitLookupUrl).then(res => {
                value.splice(value.findIndex(e => e === element), 1);
                value.push(res.data.name);
            })
        }))
    }
}


client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
    msg.isDM = (msg.guild ? false : true);
    if (msg.author.bot) return;
    if (msg.isDM == true) {
        if (msg.content.startsWith('!api')) {
            api[msg.author.id] = msg.content.slice(5);
            let apiBuffer = JSON.stringify(api);
            fs.writeFile('./apis.json', apiBuffer, 'utf8', (err) => {
                if (err) throw err;
            })
            msg.reply("Added!");
        }
    }
    if (msg.content.indexOf(process.env.prefix) !== 0) return;
    if (msg.content.startsWith('!build')) {
        if (!api.hasOwnProperty(msg.author.id)) return loadApi(msg.author);
        let buildCharacter = msg.content.slice(7);
        apiCall = "?access_token=" + api[msg.author.id];
        getBuild(buildCharacter).then(() => {
            let channel = msg.channel;
            channel.send(buildCharacter);
            for (let [key, value] of Object.entries(specializationResponse)) {
                channel.send(key + ": " + value.join(", "))
            }
        });
    }
});

client.login(process.env.DISCORD_TOKEN);