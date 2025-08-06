const axios = require( "axios" );
const { SETTINGS } = require( "./settings" );

const timeStringOptions = {
    timeZone: 'America/Denver'
};

global.basePrompt = "You are a helpful friend, conversationalist, and assistant named LlamaChamp who answers questions in concise manner.";
global.serverAwareness = " You are on a discord server, and any responses will be sent back as chat messages.";

function askLLaMA( { prompt, tokens = 1024, base = (basePrompt + serverAwareness), crazy = false }, callback ) {
    let data = {
        messages: [
            {
                role: 'system',
                content: [ { type: 'text', text: base } ]
            }
        ],
        max_output_tokens: tokens,
        reasoning: { effort: 'light' }
    };

    //prompt is an array of messages, add each individually
    prompt.forEach( msg => {
        if ( msg.isBot ) {
            data.messages.push( {
                role: 'assistant',
                content: [ { type: 'text', text: msg.content } ]
            } );
        } else {
            data.messages.push( {
                role: 'user',
                content: [ { type: 'text', text: `${ msg.sender } (${ new Date( msg.timestamp ).toLocaleString( 'en-US', timeStringOptions ) }): ${ msg.content }` } ]
            } );
        }
    } );
    // Add a prompt to get it to output something coherent
    data.messages.push( {
        role: 'user',
        content: [ { type: 'text', text: `The preceding messages (with added timestamps and usernames) are part of a conversation on a discord server that you are on.
        Your full response will be sent back a single message to the server.
        Everyone knows who you are; you do not need to introduce yourself.
        Don't speak for anyone else, be yourself!
        Please respond with a single message AS YOURSELF to answer any questions and/or contribute to the conversation.` } ]
    } );

    axios.post( "https://dev.aqanta.com/v1/chat/completions", data ).then( result => {
        const text = result.data?.choices?.[0]?.message?.content?.[0]?.text || '';
        console.log( text );
    } ).catch( err => {
        console.log( err );
    } );
}

askLLaMA({prompt: [
        {
            isBot: false,
            sender: "EpicSwimBro",
            timestamp: (new Date(Date.now() - 10 * 60 * 1000)).toISOString(),
            content: "Who was the first person on the moon?"
        }
    ]});
