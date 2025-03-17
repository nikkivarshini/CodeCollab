from flask import Flask, request, jsonify
from transformers import AutoModelForCausalLM, AutoTokenizer

# Initialize Flask app
app = Flask(__name__)

# Load the pre-trained model and tokenizer
# Example using GPT-2 model
model_name = "gpt2"  # A general-purpose model
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(model_name)


@app.route("/chat", methods=["POST"])
def chat():
    """
    Endpoint to handle user queries and provide coding suggestions or fixes.
    """
    try:
        # Get the user input from the request
        user_input = request.json.get("message", "").strip()
        if not user_input:
            return jsonify({"error": "No input message provided"}), 400

        # Encode the input and generate a response
        input_ids = tokenizer.encode(user_input, return_tensors="pt")
        output = model.generate(
            input_ids,
            max_length=200,  # Adjust max length of the response
            num_return_sequences=1,
            temperature=0.7,  # Adjust randomness
            pad_token_id=tokenizer.eos_token_id
        )

        # Decode the generated response
        response = tokenizer.decode(output[0], skip_special_tokens=True)

        # Return the response
        return jsonify({"response": response})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
