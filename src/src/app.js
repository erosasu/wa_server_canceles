import fetch from 'node-fetch'; // Import directly instead of using dynamic import
import OpenAI from 'openai';

import chatModel from './chat.js';
import { generatePrompt } from './prompt.js';
import { tools } from './tools.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API,
});
const model = 'gpt-4o-mini';

let fetchInstance;

const setupFetch = async () => {
  fetchInstance = fetch;
};

setupFetch();

async function getProductsImages(query) {
  console.log('entro a get images');
  console.log(query);
  const baseUrl = `https://api.platvialum.com/psi_no_auth`;
  try {
    const response = await fetchInstance(`${baseUrl}?descripcion=${query}`);
    const imagesData = await response.json();
    const images = imagesData.SimiProductImages;
    console.log(images);
    if (images.length == 0) {
      return `Podrías ser mas especifico en el tipo de ${query} para mostrarte imagenes`;
    }
    return images;
  } catch (error) {
    console.error('Error fetching product images:', error);
    return null;
  }
}

async function quoteProduct(toolArguments, customerInfo) {
  console.log(toolArguments);
  const description = toolArguments['description'];
  const alto = toolArguments['alto'];
  const ancho = toolArguments['ancho'];
  const domicilio = toolArguments['domicilio'];
  console.log(description, alto, ancho, domicilio);
  const baseUrl = `https://api.platvialum.com/autocotizar/6490fc33b844a5d0f55ab865`;
  try {
    const response = await fetchInstance(
      `${baseUrl}?descripcion=${description}&alto=${alto}&ancho=${ancho}&domicilio=${domicilio}&celular=${customerInfo.contact}&cliente=${customerInfo.customerName}`
    );
    const {
      conceptos,
      cliente,
      precioCliente,
      decripcion,
      noCotizacion,
      paymentLink,
    } = await response.json();
    let precioNetoIVA = precioCliente * 1.16;
    return {
      conceptos,
      cliente,
      precioNetoIVA,
      decripcion,
      noCotizacion,
      paymentLink,
    };
  } catch (error) {
    console.error('Error generating quote:', error);
    return null;
  }
}

//Step 2: determine if the response from the model includes a tool call.

async function determineFunction(
  toolCalls,
  thread,
  contact,
  customerName,
  client,
  message,
  tool_message
) {
  let quotationContent;

  try {
    if (toolCalls && toolCalls.length > 0) {
      // Añade el mensaje de tool_calls al hilo
      thread.messages.push(tool_message);

      for (const toolCall of toolCalls) {
        const toolCallId = toolCall.id;
        const toolFunctionName = toolCall.function.name;
        const toolArguments = JSON.parse(toolCall.function.arguments);

        // Variable para almacenar los resultados de la llamada de herramienta
        let results = null;

        // Step 3: Call the function and retrieve results. Append the results to the messages list.
        if (toolFunctionName === 'getProductImages') {
          const toolQueryString = toolArguments['query'];
          results = await getProductsImages(toolQueryString);

          // Convert results to string if it's an array
          if (Array.isArray(results)) {
            for (let image of results) {
              await client
                .sendImage(
                  message.from,
                  image.imagePath,
                  `${image.descripcion} Precio: $${image.precioUnitario}`
                )
                .catch((erro) => {
                  console.error('Error when sending: ', erro); //return object error
                });
            }
            results = JSON.stringify(results);

            thread.messages.push({
              role: 'tool',
              tool_call_id: toolCallId,
              name: toolFunctionName,
              content: results,
            });
          } else {
            await client
              .sendText(
                message.from,
                `Podrías ser mas especifico en el tipo de ${toolQueryString} para mostrarte imagenes`
              )
              .catch((erro) => {
                console.error('Error when sending: ', erro); //return object error
              });

            thread.messages.push({
              role: 'tool',
              tool_call_id: toolCallId,
              name: toolFunctionName,
              content: results,
            });
          }
        } else if (toolFunctionName === 'quoteProduct') {
          const customerInfo = {
            contact,
            customerName,
            address: thread.address,
          };
          quotationContent = JSON.stringify(
            await quoteProduct(toolArguments, customerInfo)
          );

          thread.messages.push({
            role: 'tool',
            tool_call_id: toolCallId,
            name: toolFunctionName,
            content: quotationContent,
          });
        } else if (toolFunctionName == 'getClientAddress') {
          const addressString = toolArguments['address'];

          thread.messages.push({
            role: 'tool',
            tool_call_id: toolCallId,
            name: toolFunctionName,
            content: `El domicilio del cliente es ${addressString}`,
          });
          thread.address = addressString;
          await client.sendText(message.from, 'Gracias');
        } else if (toolFunctionName == 'sendAccountInfo') {
          const content =
            'Banco BBVA \nNombre: Ernesto Rosas Uriarte \nCLABE:012320004828656106 \nTarjeta: 4152314211624153';
          thread.messages.push({
            role: 'tool',
            tool_call_id: toolCallId,
            name: toolFunctionName,
            content,
          });
          await client.sendText(message.from, content);
        } else if (toolFunctionName == 'sendAddress') {
          const content =
            'Mi ubicación, av valdepeñas 2565 esquina con tolosa lomas de zapopan jalisco';
          thread.messages.push({
            role: 'tool',
            tool_call_id: toolCallId,
            name: toolFunctionName,
            content,
          });
          await client.sendLocation(
            message.from,
            '20.74780046035927',
            '-103.3983425131533',
            'Mexico'
          );
        } else if (toolFunctionName == 'sendCatalog') {
          const content =
            'Te invito a que revises algunos de los productos que hemos instalado para cientos de clientes en el siguiente link: https://platvialum.com/portafolio/6490fc33b844a5d0f55ab865 ';
          thread.messages.push({
            role: 'tool',
            tool_call_id: toolCallId,
            name: toolFunctionName,
            content,
          });
          await client.sendText(
            message.from,
            'Te invito a que revises algunos de los productos que hemos instalado para cientos de clientes en el siguiente link: https://platvialum.com/portafolio/6490fc33b844a5d0f55ab865 '
          );
        } else {
          thread.messages.push({
            role: 'tool',
            tool_call_id: toolCallId,
            name: toolFunctionName,
            content: 'Mensaje de proteccion',
          });
          console.error(`Error: function ${toolFunctionName} does not exist`);
          continue; // Salta a la siguiente iteración si la función no existe
        }
      }

      if (quotationContent) {
        const modelResponseWithFunctionCall =
          await openai.chat.completions.create({
            model,
            messages: thread.messages,
          });
        console.log(modelResponseWithFunctionCall.choices[0].message.content);

        let resultsBeauty =
          modelResponseWithFunctionCall.choices[0].message.content;
        await client.sendText(message.from, resultsBeauty).catch((error) => {
          console.error('Error when sending: ', error); //return object error
        });
        thread.messages.push();
      }

      await thread.save();
    } else {
      // Model did not identify a function to call, result can be returned to the user
      console.log('no function identified');
    }
  } catch (error) {
    console.log(error);
  }
}

export default async function start(client) {
  client.onMessage(async (message) => {
    console.log(message.from, message.body);

    let thread = await chatModel.findOne({ from: message.from });
    if (!thread) {
      thread = await chatModel.create({
        from: message.from,
        name: message.notifyName,
        messages: {
          role: 'system',
          content: await generatePrompt(message.notifyName, message.from),
        },
      });
    }

    thread.messages.push({
      role: 'user',
      content: message.body || '',
    });

    let response = await openai.chat.completions.create({
      model: model,
      messages: thread.messages,
      tools: tools,
      tool_choice: 'auto',
    });
    let tool_message = response.choices[0].message;
    if (!tool_message.content) {
      tool_message.content = 'function call';
    } else {
      await client.sendText('5213314243625@c.us', tool_message.content);
    }
    console.log(tool_message);
    if (tool_message.tool_calls) {
      await determineFunction(
        tool_message.tool_calls,
        thread,
        message.from,
        message.notifyName,
        client,
        message,
        tool_message
      );
      await thread.save();
    } else {
      thread.save();
    }
  });
}

/*
class EventHandler extends EventEmitter {
    constructor(client) {
        super();
        this.client = client;
    }

    async onEvent(event) {
        try {
            console.log(event);
            // Retrieve events that are denoted with 'requires_action'
            // since these will have our tool_calls
            if (event.event === "thread.run.requires_action") {
                await this.handleRequiresAction(
                    event.data,
                    event.data.id,
                    event.data.thread_id,
                );
            }
        } catch (error) {
            console.error("Error handling event:", error);
        }
    }

    async handleRequiresAction(data, runId, threadId) {
        try {
            const toolOutputs = await Promise.all(
                data.required_action.submit_tool_outputs.tool_calls.map(async (toolCall) => {
                    if (toolCall.function.name === "getProductsImages") {
                        const images = await getProductsImages(toolCall.arguments.description);
                        return {
                            tool_call_id: toolCall.id,
                            output: images,
                        };
                    } else if (toolCall.function.name === "quoteProduct") {
                        const quote = await quoteProduct(
                            toolCall.arguments.description,
                            toolCall.arguments.contact,
                            toolCall.arguments.customerName,
                            toolCall.arguments.address
                        );
                        return {
                            tool_call_id: toolCall.id,
                            output: quote,
                        };
                    }
                })
            );

            // Submit all the tool outputs at the same time
            await this.submitToolOutputs(toolOutputs, runId, threadId);
        } catch (error) {
            console.error("Error processing required action:", error);
        }
    }

    async submitToolOutputs(toolOutputs, runId, threadId) {
        try {
            // Use the submitToolOutputsStream helper
            const stream = this.client.beta.threads.runs.submitToolOutputsStream(
                threadId,
                runId,
                { tool_outputs: toolOutputs },
            );
            for await (const event of stream) {
                this.emit("event", event);
            }
        } catch (error) {
            console.error("Error submitting tool outputs:", error);
        }
    }
}
    const thread = await openai.beta.threads.create({metadata:{from:message.body}});
    const msg = await openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: message.body,
    });

    console.log(msg);
    const eventHandler = new EventHandler(openai);
    eventHandler.on("event", eventHandler.onEvent.bind(eventHandler));

    const stream = await openai.beta.threads.runs.create(
        thread.id,
        { assistant_id: assistantId },
      
    );

*/
