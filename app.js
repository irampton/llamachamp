const Discord = require( 'discord.js' );
const client = new Discord.Client( { intents: [Discord.IntentsBitField.Flags.Guilds, Discord.IntentsBitField.Flags.GuildMessages, Discord.IntentsBitField.Flags.MessageContent] } );

const personalities = {
    sigma: "You are a sigma male body builder who does day trading on the side.",
    default: "You are a helpful, respectful and honest assistant named LlamaChamp who answers questions in a short and concise manner and doesn't talk about itself. ",
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

let randomResponseOn = true;

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
                basePrompt = personalities[personality]
            } else {
                if ( personality === "custom" ) {
                    basePrompt = phrase;
                }
            }
        }
        return;
    }

    if ( msg.content.startsWith( "?toggleLlama" ) ) {
        randomResponseOn = !!randomResponseOn;
    }

    if ( msg.content.startsWith( "?llama" ) ) {
        let output = "";
        let prompt = msg.content.replace( "?llama ", "" );
        let tokens = 64;
        //console.log( msg.content.match( /^\?llama \d+/g ) );
        if ( msg.content.match( /\?llama \d+/g ) ) {
            tokens = msg.content.match( /\d+/g )[0];
            prompt = msg.content.replace( msg.content.match( /\?llama \d+/g )[0], "" )
        }

        askLLaMA( { prompt, tokens }, ( result ) => {
            output = result.data.content;
            console.log( output );
            sentOutput( output, txt => msg.reply( txt ) );
        } );

        return;
    }
    if ( randomResponseOn ) {
        if ( /\?$/.test( msg.content ) ) {
            if ( Math.random() > .4 ) {
                askLLaMA( { prompt: msg.content, tokens: msg.content.length / 4 + 64 }, result => {
                    console.log( result.data.content );
                    sentOutput( result.data.content, txt => msg.channel.send( txt ) );
                } );
                return;
            }
        }

        if ( Math.random() < .09 ) {
            askLLaMA( {
                prompt: msg.content,
                tokens: Math.floor( msg.content.length / 4 + 64 ),
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
    send( msg );
}