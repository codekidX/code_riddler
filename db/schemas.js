const ObjectID = require('mongodb').ObjectID;
class Schemas {
  constructor(mongoose) {
    this.RiddleSchema = {
      title: String,
      riddle: String,
      answers: String,
      worth: Number,
      is_approved: Boolean,
      hint: String,
      publisher_id: ObjectID,
      publisher_name: String
    };
    this.Riddle = mongoose.model('riddles', this.RiddleSchema);

    this.User = mongoose.model('users', {
      username: String,
      hash: String,
      points: Number,
      ghId: Number,
      ghInfo: Object,
      solved_riddles: [ObjectID]
    });
  }
}

module.exports = {
  Schemas
};
