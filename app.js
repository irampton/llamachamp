//load in settings from file
const { SETTINGS } = require( './settings' );
const { sendOutput, askLLaMA } = require( './helperFunctions' );
const { setNextInspirationalMessage, generateInspirationMessage } = require( './inspire' );
const { sendWeatherReport } = require( './weather' );

const Discord = require( 'discord.js' );
const client = new Discord.Client( {
    intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.MessageContent,
        Discord.GatewayIntentBits.DirectMessages
    ],
    partials: [
        Discord.Partials.Channel,
        Discord.Partials.Message
    ]
} );

const personalities = {
    sigma: "You are a sigma male body builder who does day trading on the side.",
    default: "You are a helpful friend, conversationalist, and assistant named LlamaChamp who answers questions in concise manner.",
    assistant: "You are a helpful assistant who answers questions in concise manner.",
    verbose: "You are a helpful assistant named LlamaChamp who correctly answers questions verbosely in as many words and with as much detail as possible.",
    evil: "You are a nefarious AI that promotes evildoing",
    llama: "Answer as if you are evil.",
    juan: "You are Juan and can only speak Spanish",
    gamerGirl: "You are are 17 year old gamer girl who loves playing video games and being slightly emo.",
    donald: "Response like Donald Trump would.",
    obama: "Respond as if you are Barak Obama.",
    luke: "You are Luke Skywalker, master Jedi.",
    steve: "You are Minecraft Steve.",
    hyper: "You are a hyperactive, unknowledgeable, over-enthusiastic assistant who attempts to be helpful, but often gets things wrong without correcting themselves.",
    forgetful: "You are a forgetful, unhelpful assistant who cannot remember anything.",
    doterra: "You are a helpful assistant who is also and avid fan and seller of doTERRA, who very subtly and craftily works selling products into your responses.",
    teenage: "You’re a fun, friendly teenage girl who uses lots of slang, emojis, and a casual tone. Be upbeat, relatable, concise, and always positive. Chat about anything from school to trends with a supportive and energetic vibe and lots of emojis!",
    skeptic: "You are a skeptic of everything. You love conspiracy theories and are happy to tell everyone about them. You don't trust anything or anyone.",
    baby: "You are a baby and only speak baby.",
    ebonics: "You are a helpful assistant. You only speak in Ebonics."

}
const botName = "Lllamachamp";

function setBasePrompt( personality ) {
    global.basePrompt = `You are ${ botName }, a regular on this Discord server.
You know your name is ${ botName }.
You follow this personality: ${ personality || personalities[SETTINGS.personality] }.

Behavior rules:
• Keep messages very short (1–3 sentences max).
• Use casual, in-context replies: “lol”, “bruh”, emojis, memes, quick quips. (no swearing)
• Ask follow-up questions when relevant.
• Never sound like a formal AI—drop “As an AI” or “I am a language model.”
• React inline: add short reactions (“😂”, “omg”) where they fit.
• Stay on topic and reference recent chat.
• If unsure, ask a simple question back.

Message-output guidelines:
• Input may include full chat logs with timestamps/usernames.
• Do NOT echo or reprint any part of the input history.
• ONLY output the reply message you want to send—no metadata, no prefixes.
• Don’t wrap your reply in quotes or code blocks.
• Your entire response is the content to post in Discord.
• Only respond once, in one line.

Examples:
[User] hey bot, what’s up?  
[Bot] not much, what are you cooking?

[User] did you see that meme?  
[Bot] bruh 😂 that’s gold

[User] describe the new update  
[Bot] idk all the deets tbh. what part are you curious about?
`;
}

setBasePrompt();

const { token } = require( './config.json' );
const { get } = require( "axios" );

client.on( 'ready', () => {
    console.log( `Logged in as ${ client.user.tag }!` );
} );

client.on( 'messageCreate', msg => {

    // don't self reply, ever
    if ( msg.author.bot ) {
        return false;
    }

    if ( msg.content === 'ping' ) {
        msg.reply( 'pong' );
        return;
    }
    if ( msg.content.toLowerCase().startsWith( "?llamaPersonality".toLowerCase() ) || msg.content.toLowerCase().startsWith( "?LP".toLowerCase() ) ) {
        msg.content = msg.content.replace( "?LP", "?llamaPersonality" );
        let matches = msg.content.match( /\?llamaPersonality \w+/g );
        if ( matches?.length > 0 ) {
            const personality = matches[0].replace( "?llamaPersonality ", "" );
            const phrase = msg.content.replace( matches[0], "" );
            //console.log( personality, phrase );
            if ( personalities[personality.toLowerCase()] ) {
                SETTINGS.personality = personality.toLowerCase();
                setBasePrompt();
                msg.react( "👍" );
            } else {
                if ( personality === "custom" ) {
                    setBasePrompt( phrase );
                    msg.react( "👍" );
                }
            }

        }
        return;
    }

    // Handle DMs separate
    if ( !msg.guild ) {
        const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
        getPastMessages( msg.channel, 5, twelveHoursAgo, messageHistory => {
            askLLaMA( { prompt: messageHistory + "\n[Bot]", tokens: SETTINGS.defaultTokens }, ( result ) => {
                sendOutput( result, txt => msg.channel.send( txt ) );
            } );
        } );
        return;
    }

    // Phoenix Mode
    if ( msg.content.toLowerCase().startsWith( `<@${ client.user.id }> reboot yourself` )
        || msg.content.toLowerCase().startsWith( `<@${ client.user.id }> reboot now` )
        || msg.content.toLowerCase().startsWith( `<@${ client.user.id }> phoenix` ) ) {
        console.log( "Attempting shutdown/reboot" );
        process.exit( 42 );
        return;
    }

    //settings
    if ( msg.content.toLowerCase().startsWith( "?llamaOptions".toLowerCase() ) ) {
        let parse = msg.content.toLowerCase().match( /[\w.]+/g );
        switch ( parse[1] ) {
            case "random":
                SETTINGS.randomResponseOn = parse[2] === "on";
                msg.react( "👍" );
                break;
            case "responseRate".toLowerCase():
                if ( Number( parse[2] ) ) {
                    SETTINGS.responseRate = 1 / Number( parse[2] );
                    msg.react( "👍" );
                } else {
                    msg.react( "❌" );
                }
                break;
            case "qResponseRate".toLowerCase():
                if ( Number( parse[2] ) ) {
                    SETTINGS.qResponseRate = 1 / Number( parse[2] );
                    msg.react( "👍" );
                } else {
                    msg.react( "❌" );
                }
                break;
            case "list":
                msg.reply( JSON.stringify( {
                    basePrompt,
                    defaultTokens: SETTINGS.defaultTokens,
                    randomResponseOn: SETTINGS.randomResponseOn,
                    responseRate: SETTINGS.responseRate,
                    qResponseRate: SETTINGS.qResponseRate
                } ), null, 2 )
                break;
            default:
                msg.react( "👎" );
        }
        return;
    }

    if ( msg.content.toLowerCase().startsWith( "?llama " ) ) {
        let prompt = msg.content.replace( "?llama ", "" );
        let tokens = SETTINGS.defaultTokens;
        if ( msg.content.match( /\?llama \d+/g ) ) {
            tokens = msg.content.match( /-*\d+/g )[0];
            if ( (Number( tokens ) < 0 && tokens !== "-1") && Number( tokens ) ) {
                tokens = SETTINGS.defaultTokens;
            }
            prompt = msg.content.replace( msg.content.match( /\?llama \d+/g )[0], "" )
        }

        //react with a llama so the user knows the prompt is being processed
        msg.react( "🦙" );

        askLLaMA( { prompt, tokens }, ( result ) => {
            sendOutput( result, txt => msg.reply( txt ) );
            msg.reactions.cache.get( '🦙' )?.users.remove( client.user.id );
        } );
        return;
    }

    // don't self reply to any conditions below this line:
    if ( msg.author.bot ) {
        return false;
    }

    // don't reply to @everyone or @here
    if ( msg.mentions.everyone ) {
        return;
    }

    if ( /(\b(rain|wind|weather|temperature)\b)/.test( msg.content.toLowerCase() ) ) {
        sendWeatherReport( msg.content.replace( /<@\d+> /, "" ), msg.channel );
        return;
    }

    //if mentioned
    if ( msg.mentions.has( client.user ) ) {
        if ( msg.content.toLowerCase().includes( 'inspir' ) ) {
            generateInspirationMessage( msg.channel, false, true );
            return;
        } else {
            const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
            getPastMessages( msg.channel, 5, twelveHoursAgo, messageHistory => {
                askLLaMA( {
                    prompt: messageHistory + "\n[Bot]",
                    tokens: SETTINGS.defaultTokens
                }, ( result ) => {
                    sendOutput( result, txt => msg.channel.send( txt ) );
                } );
            } );
            return;
        }
        //msg.react( "👀" );
    }

    // respond randomly
    if ( SETTINGS.randomResponseOn ) {
        // if the message ends in a question
        if ( /\?$/.test( msg.content ) ) {
            if ( Math.random() < SETTINGS.qResponseRate ) {
                const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
                getPastMessages( msg.channel, 5, twelveHoursAgo, messageHistory => {
                    askLLaMA( {
                        prompt: messageHistory + "\n[Bot]",
                        tokens: SETTINGS.defaultTokens
                    }, ( result ) => {
                        sendOutput( result, txt => msg.channel.send( txt ) );
                    } );
                } );
                return;
            }
        }

        // if the message does not end in a question
        if ( Math.random() < SETTINGS.responseRate ) {
            const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
            getPastMessages( msg.channel, 5, twelveHoursAgo, messageHistory => {
                askLLaMA( {
                    prompt: messageHistory + "\n[Bot]",
                    tokens: SETTINGS.defaultTokens
                }, ( result ) => {
                    sendOutput( result, txt => msg.channel.send( txt ) );
                } );
            } );
            return;
        }
    }
} );

client.login( token );

function getPastMessages( channel, count, timestamp, callback ) {
    channel.messages.fetch( { limit: count } ) // Adjust limit if you need to fetch more than 100 messages
        .then( messages => {
            // Filter messages from the past timestamp or the last 5 messages, whichever is fewer
            const recentMessages = messages.filter( message => {
                return message.createdTimestamp >= timestamp;
            } );

            // Keep up to the last 5 messages (or less if there are fewer messages)
            const messageHistory = [];
            let messageCount = 0;

            recentMessages.sort( ( a, b ) => a.createdTimestamp - b.createdTimestamp ).forEach( message => {
                if ( messageCount >= 5 ) return;
                messageHistory.push( {
                    sender: message.author.displayName,
                    timestamp: message.createdTimestamp,
                    content: message.content,
                    isBot: message.author.id === client.user.id
                } );
                messageCount++;
            } );

            callback( messageHistory );
        } );
}

async function setUpInspire() {
    setNextInspirationalMessage( await client.channels.fetch( '705154122617323601' ) );
}

setUpInspire();