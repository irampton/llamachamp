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
    if ( msg.length > 2000 ) {
        while ( msg.length > 2000 ) {
            send( msg.slice( 0, 1800 ) );
            msg = msg.slice( 1800 );
        }
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