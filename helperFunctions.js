const axios = require( "axios" );
module.exports = {
    sendOutput,
    askLLaMA,
    randomInt
};

const timeStringOptions = {
    timeZone: 'America/Denver'
};

function sendOutput( msg, send ) {
    // Ignore attempts to send empty or whitespace-only messages
    if ( !msg || !msg.trim() ) {
        console.warn( 'Attempted to send an empty message. Skipping.' );
        return;
    }

    // Trim leading/trailing whitespace to avoid blank sends
    msg = msg.trim();

    const LIMIT = 2000;
    const SEARCH_RANGE = 20; // characters to look back for a space

    // Send the message in chunks if it exceeds Discord's character limit
    while ( msg.length > LIMIT ) {
        let splitPoint = LIMIT;
        const space = msg.lastIndexOf( ' ', LIMIT );
        if ( space !== -1 && space >= LIMIT - SEARCH_RANGE ) {
            splitPoint = space;
        }

        const chunk = msg.slice( 0, splitPoint ).trimEnd();
        if ( chunk.trim() ) {
            send( chunk );
        }

        msg = msg.slice( splitPoint ).trimStart();
    }

    // Only send if there's content remaining after chunking
    if ( msg.trim().length === 0 ) {
        return;
    }

    try {
        send( msg );
    } catch ( e ) {
        console.error( e );
    }
}

function askLLaMA( { prompt, tokens, base = basePrompt, crazy = false }, callback ) {
    let data = {
        messages: [
            {
                role: 'system',
                content: [ { type: 'text', text: base } ]
            }
        ],
        max_output_tokens: Number( tokens ),
        reasoning: { effort: 'light' }
    };

    if ( typeof prompt === 'string' ) {
        data.messages.push( {
            role: 'user',
            content: [ { type: 'text', text: prompt } ]
        } );
    } else if ( Array.isArray( prompt ) ) {
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
    }

    if ( crazy ) {
        data.top_k = 100;
        data.top_p = .20;
    }

    axios.post( "http://llama.cpp:8000/v1/chat/completions", data ).then( result => {
        const text = result.data?.choices?.[0]?.message?.content?.[0]?.text || '';
        callback( text );
    } ).catch( err => {
        console.log( err );
    } );
}

function randomInt( low, high ) {
    return Math.floor( Math.random() * (high - low) ) + low;
}