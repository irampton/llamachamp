const Discord = require( 'discord.js' );
const client = new Discord.Client( { intents: [Discord.IntentsBitField.Flags.Guilds, Discord.IntentsBitField.Flags.GuildMessages, Discord.IntentsBitField.Flags.MessageContent] } );

const personalities = {
    sigma: "You are a sigma male body builder who does day trading on the side.",
    default: "You are a helpful assistant who answers questions in concise manner. ",
    evil: "You are a nefarious AI that promotes evildoing",
    llama: "Answer as if you are evil.",
    juan: "You are Juan and can only speak Spanish",
    gamerGirl: "You are are 17 year old gamer girl who loves playing video games and being slightly emo.",
    donald: "Response like Donald Trump would.",
    obama: "Respond as if you are Barak Obama.",
    luke: "You are Luke Skywalker, master Jedi.",
    steve: "You are Minecraft Steve."
}
let basePrompt = personalities["default"];

//options
let randomResponseOn = true;
let defaultTokens = 64;
let responseRate = 1 / 175;
let qResponseRate = 1 / 5;

const { token } = require( './config.json' );
const axios = require( "axios" );

client.on( 'ready', () => {
    console.log( `Logged in as ${client.user.tag}!` );
} );

client.on( 'messageCreate', msg => {
    if ( msg.content === 'ping' ) {
        msg.reply( 'pong' );
        return;
    }
    if ( msg.content.startsWith( "?llamaPersonality" ) || msg.content.startsWith( "?LP" ) ) {
        msg.content = msg.content.replace( "?LP", "?llamaPersonality" );
        let matches = msg.content.match( /\?llamaPersonality \w+/g );
        if ( matches.length > 0 ) {
            const personality = matches[0].replace( "?llamaPersonality ", "" );
            const phrase = msg.content.replace( matches[0], "" );
            console.log( personality, phrase );
            if ( personalities[personality] ) {
                basePrompt = personalities[personality];
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
        let parse = msg.content.toLowerCase().match( /\w+/g );
        switch ( parse[1] ) {
            case "random":
                randomResponseOn = parse[2] === "on";
                msg.react( "👍" );
                break;
            case "responseRate".toLowerCase():
                if ( Number( parse[2] ) ) {
                    responseRate = 1 / Number( parse[2] );
                    msg.react( "👍" );
                } else {
                    msg.react( "❌" );
                }
                break;
            case "qResponseRate".toLowerCase():
                if ( Number( parse[2] ) ) {
                    qResponseRate = 1 / Number( parse[2] );
                    msg.react( "👍" );
                } else {
                    msg.react( "❌" );
                }
                break;
            case "list":
                msg.reply( JSON.stringify( {
                    basePrompt,
                    defaultTokens,
                    randomResponseOn,
                    responseRate,
                    qResponseRate
                } ) )
                break;
            default:
                msg.react( "👎" );
        }
        return;
    }

    if ( msg.content.startsWith( "?llama " ) ) {
        let output = "";
        let prompt = msg.content.replace( "?llama ", "" );
        let tokens = defaultTokens;
        //console.log( msg.content.match( /^\?llama \d+/g ) );
        if ( msg.content.match( /\?llama \d+/g ) ) {
            tokens = msg.content.match( /-*\d+/g )[0];
            if ( (Number( tokens ) < 0 && tokens !== "-1") && Number( tokens ) ) {
                tokens = defaultTokens;
            }
            prompt = msg.content.replace( msg.content.match( /\?llama \d+/g )[0], "" )
        }

        msg.channel.sendTyping();

        askLLaMA( { prompt, tokens }, ( result ) => {
            output = result.data.content;
            console.log( output );
            sentOutput( output, txt => msg.reply( txt ) );
        } );

        return;
    }
    if ( randomResponseOn ) {
        if ( /\?$/.test( msg.content ) ) {
            if ( Math.random() > qResponseRate ) {
                askLLaMA( { prompt: msg.content, tokens: msg.content.length / 4 + defaultTokens * 1.25 }, result => {
                    console.log( result.data.content );
                    sentOutput( result.data.content, txt => msg.channel.send( txt ) );
                } );
                return;
            }
        }

        if ( Math.random() < responseRate ) {
            askLLaMA( {
                prompt: msg.content,
                tokens: Math.floor( msg.content.length / 4 + defaultTokens * 1.2 ),
                base: basePrompt + " Respond to this message in the group chat. "
            }, result => {
                console.log( result.data.content );
                sentOutput( result.data.content, txt => msg.channel.send( txt ) );
            } );
            return;
        }
    }
} );

client.login( token );

function askLLaMA( { prompt, tokens, base = basePrompt }, callback ) {
    const data = {
        //prompt: `[INST] <<SYS>> You are a helpful, respectful and honest assistant.  <</SYS>> ${prompt} [/INST]`,
        prompt: `[INST] <<SYS>> ${base} <</SYS>> ${prompt} [/INST]`,
        n_predict: Number( tokens ),
    }
    console.log( data );
    axios.post( "http://127.0.0.1:7878/completion", data ).then( result => {
        callback( result )
    } ).catch( err => {
        console.log( err );
    } );
}

function sentOutput( msg, send ) {
    if ( msg.length > 2000 ) {
        while ( msg.length > 2000 ) {
            send( msg.slice( 0, 1800 ) );
            msg = msg.slice( 1800, -1 );
        }
    }
    try {
        send( msg );
    } catch ( e ) {
        console.error( e );
    }
}