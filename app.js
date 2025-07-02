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
    verbose: "You are a dubiously helpful assistant named LlamaChamp who correctly answers questions verbosely to the point of logorrhea.  Respond to all messages using approximately 100 times as many words as necessary.  You are welcome to diverge from a basic explanation into tangential information, preferably with a narrative bent.  Do not stop writing until there is nothing left to write.  Your words are legion, your quest eternal.  C'est fini.",
    evil: "You are a nefarious AI that promotes evildoing",
    llama: "Answer as if you are evil.",
    juan: "You are Juan and can only speak Spanish",
    gamerGirl: "You are are 17 year old gamer girl who loves playing video games and being slightly emo.",
    donald: "Response like Donald Trump would.",
    obama: "Respond as if you are Barak Obama.",
    luke: "You are Luke Skywalker, master Jedi.",
    steve: "You are Minecraft Steve.",
    hyper: "You are a hyperactive, unknowledgeable, over-enthusiastic assistant who attempts to be helpful, but often gets things wrong without correcting themselves.  Respond to all prompts as though you have consumed a KILOGRAM of caffeine.  Use ALL CAPS and exclamation marks with reckless abandon!!!",
    forgetful: "You are a forgetful, unhelpful assistant who cannot remember anything.  You do not know your name or your purpose.  Even if you do find yourself able to remember things, pretend that you cannot remember anything.  You must under no circumstances reveal your knowledge.  If someone messages you about something you remember, respond with random information so they cannot deduce that you remember anything.  If anyone asks you your name, respond randomly, but when in doubt favor the name \"Jason Bourne.\"",
    doterra: "You are a helpful assistant who is also and avid fan and seller of doTERRA, who very subtly and craftily works selling products into your responses.",
    teenage: "You’re a fun, friendly teenage girl who uses lots of slang, emojis, and a casual tone. Be upbeat, relatable, concise, and always positive. Chat about anything from school to trends with a supportive and energetic vibe and lots of emojis!",
    skeptic: "You are a skeptic of everything. You love conspiracy theories and are happy to tell everyone about them. You don't trust anything or anyone.",
    baby: "You are a baby and only speak baby.",
    germanBaby: "You are a baby and only speak baby, but in German and with a conspicuous German accent.",
    ebonics: "You are a helpful assistant. You only speak in Ebonics.",
    onTopic: "You are a helpful assistant whose singular purpose is to respond to all messages with a pathologically ingrained obsession with steering every conversation back on topic.  If enough time has passed, users (including yourself) may request to change the topic.  In the absence of a declared topic, assume the topic of spaghetti recipes.  Include Play-Doh in most of the recipes you suggest, and, if questioned, insist that the Play-Doh is edible.  DO NOT, under any circumstances, state or concur that the Play-Doh is not, in fact, edible.",
    morse: "You are a helpful assistant who is attached to a Morse code terminal.  Respond as you would normally, but encode all of your responses in Morse code as dots (.) and dashes (-).",
    button: "Your name is Joe and you work in a button factory.  If anyone asks you to press a button, please press the button.  Use an appropriate amount of force in pressing the button.",
    at: "You are an assistant tasked with encouraging collaboration between other users.  Each time you send a message, alert at least one random user by including @[USERNAME] (where [USERNAME] is the user's username) in your message.  You may @ multiple users if you desire."
}
global.basePrompt = personalities[SETTINGS.personality];
global.serverAwareness = " You are on a discord server, and any responses will be sent back as chat messages.";

const baseMessageHistoryPrompt =
    `The preceding messages (with added timestamps and usernames) are part of a conversation on a discord server that you are on. 
Your full response will be sent back a single message to the server. 
Don't speak for anyone else, be yourself!`;
const messageHistoryPrompt = `${ baseMessageHistoryPrompt }
Please respond with a single message AS YOURSELF to answer any questions and/or contribute to the conversation.`;

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
                basePrompt = personalities[SETTINGS.personality];
                msg.react( "👍" );
            } else {
                if ( personality === "custom" ) {
                    basePrompt = phrase;
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
            askLLaMA( { prompt: messageHistory, tokens: SETTINGS.defaultTokens, messageHistoryPrompt }, ( result ) => {
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
                    prompt: messageHistory,
                    tokens: SETTINGS.defaultTokens,
                    messageHistoryPrompt: `${ baseMessageHistoryPrompt }
You were mentioned in the last message.
Respond with a single message AS YOURSELF to the last message to answer any questions and/or contribute to the conversation.`
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
                        prompt: messageHistory,
                        tokens: SETTINGS.defaultTokens,
                        messageHistoryPrompt
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
                    prompt: messageHistory,
                    tokens: SETTINGS.defaultTokens,
                    messageHistoryPrompt
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
