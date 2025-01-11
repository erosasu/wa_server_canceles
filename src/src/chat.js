import mongoose from 'mongoose';

mongoose.connect(
  'mongodb+srv://ernierous:cuantum47@cluster0.3m7828i.mongodb.net/clientes_conversaciones?retryWrites=true&w=majority'
);
const chatSchema = mongoose.Schema({
  from: { type: String },
  name: { type: String },
  firstMessageTime: Date,
  messages: [
    {
      timeStamps: { type: Date, default: Date.now },
      role: { type: String },
      content: {
        type: String,
        default: 'object',
        required: true,
        validate: {
          validator: function (v) {
            return v !== null;
          },
          message: (props) => `${props.value} should not be null`,
        },
      },
      tool_calls: { type: Object },
      tool_call_id: { type: String },
      tool_call_ids: [{ type: Object }],
      weight: { type: Number, default: 1 },
    },
  ],
  address: { type: String },
});
export default mongoose.model('whatapp_clientsChats_270624', chatSchema);
