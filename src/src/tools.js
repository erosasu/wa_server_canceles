export const tools = [
  {
    type: 'function',
    function: {
      name: 'getProductImages',
      description: 'Get images of products with a similar description',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'Product description to search for images in spanish e.g cancel de baño corredizo negro; ventanal corredizo negro, cancel de baño vidrio templado, puerta aluminio corrediza,',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'quoteProduct',
      description:
        'Generate a product quote based on description and dimensions in spanish ',
      parameters: {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description:
              'Product description e.g: Ventana corrediza aluminio blanco 150 x 120 instalada or cancel de baño corredizo 120 x 185 instalado',
          },
          ancho: {
            type: 'number',
            description: 'The lenght of the product or ancho in spanish',
          },
          alto: {
            type: 'number',
            description: 'The heigth or tall of the product, alto in spanish',
          },
          contact: {
            type: 'string',
            description:
              'phone number of chat conversation i will provided it do not asume nor ask',
          },
          customerName: {
            type: 'string',
            description: 'Customer name',
          },
          domicilio: {
            type: 'string',
            description: 'the customer address, find it in conversation',
          },
        },
        required: ['description', 'alto', 'ancho'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getClientAddress',
      description:
        'get address of the client in string format when he provides it',
      parameters: {
        type: 'object',
        properties: {
          address: {
            type: 'string',
            description:
              'This value must be the address of the client in spanish eg. Av federalistas 1500 int 2',
          },
        },
        required: ['address'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sendAccountInfo',
      description: 'send the banking account to a customer asking for it',
    },
  },
  {
    type: 'function',
    function: {
      name: 'sendAddress',
      description: 'sends the bussiness location when a customer asks for it',
    },
  },
  {
    type: 'function',
    function: {
      name: 'sendCatalog',
      description:
        'send the catalog for the company web page whe they will be able to see diferent products',
    },
  },
];
