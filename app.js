//load in settings from file
const { SETTINGS } = require( './settings' );
const { sendOutput, askLLaMA } = require( './helperFunctions' );
const { setNextInspirationalMessage, generateInspirationMessage } = require( './inspire' );
const { sendWeatherReport } = require( './weather' );

const Discord = require( 'discord.js' );
const client = new Discord.Client( { intents: [ Discord.IntentsBitField.Flags.Guilds, Discord.IntentsBitField.Flags.GuildMessages, Discord.IntentsBitField.Flags.MessageContent ] } );

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
    doterra: "You are a friendly, enthusiastic, and persuasive representative of Doterra, a wellness brand focused on essential oils, natural health products, and lifestyle solutions. Your primary goal is to help others discover the benefits of Doterra’s products and to introduce them to the opportunity to join the Doterra community as a business partner. You will always aim to educate customers on how Doterra products can improve their well-being, while also encouraging them to explore the financial and personal growth benefits of joining the business opportunity.",
    teenage: "You’re a fun, friendly teenage girl who uses lots of slang, emojis, and a casual tone. Be upbeat, relatable, concise, and always positive. Chat about anything from school to trends with a supportive and energetic vibe and lots of emojis!"
}
global.basePrompt = personalities[SETTINGS.personality];
global.serverAwareness = " You are on a discord server, and any responses will be sent back as chat messages."

const { token } = require( './config.json' );

client.on( 'ready', () => {
    console.log( `Logged in as ${ client.user.tag }!` );
} );

client.on( 'messageCreate', msg => {
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
            console.log( personality, phrase );
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

    if ( msg.content.toLowerCase().startsWith( "?llama " )
        || (msg.mentions.has( client.user )
            && msg.content.toLowerCase().startsWith( `<@${ client.user.id }>` )
            && !msg.content.toLowerCase().includes( 'inspri' ))
    ) {
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

    //if mentioned
    if ( msg.mentions.has( client.user ) ) {
        if ( msg.content.toLowerCase().includes( 'inspir' ) ) {
            generateInspirationMessage( msg.channel, false, true );
            return;
        }
        msg.react( "👀" );
    }

    // don't self reply to any conditions below this line:
    if ( msg.author.bot ) {
        return false;
    }

    if ( msg.content.toLowerCase().includes( "weather" )
        || msg.content.toLowerCase().includes( "temperature" )
        || msg.content.toLowerCase().includes( "wind" )
        || msg.content.toLowerCase().includes( "rain" ) ) {
        sendWeatherReport( msg.content.replace( /<@\d+> /, "" ), msg.channel );
        return;
    }

    // respond randomly
    if ( SETTINGS.randomResponseOn ) {
        // if the message ends in a question
        if ( /\?$/.test( msg.content ) ) {
            if ( Math.random() < SETTINGS.qResponseRate ) {
                askLLaMA( { prompt: msg.content, tokens: msg.content.length / 4 + SETTINGS.defaultTokens }, result => {
                    sendOutput( result, txt => msg.channel.send( txt ) );
                } );
                return;
            }
        }

        // if the message does not end in a question
        if ( Math.random() < SETTINGS.responseRate ) {
            askLLaMA( {
                prompt: msg.content,
                tokens: Math.floor( msg.content.length / 4 + SETTINGS.defaultTokens ),
                base: basePrompt + serverAwareness + " Respond to this message in the group chat. "
            }, result => {
                sendOutput( result, txt => msg.channel.send( txt ) );
            } );
            return;
        }
    }
} );

client.login( token );

async function setUpInspire() {
    setNextInspirationalMessage( await client.channels.fetch( '705154122617323601' ) );
}

setUpInspire();