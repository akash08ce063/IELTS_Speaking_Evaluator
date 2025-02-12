from langchain_ollama import ChatOllama
from langchain_core.prompts import PromptTemplate
from pydantic import BaseModel, Field

IELTS_EVALUATION_PROMPT = """ Prompt:

You are an IELTS speaking evaluator. Given the following topic and transcript, please evaluate it based on the following criteria:

1. Grammar (out of 10):
    - Assess the accuracy and complexity of the grammar used in the transcript.
    - Consider sentence structure, verb tenses, subject-verb agreement, articles, prepositions, and overall fluency.
    - Provide a score out of 10 for grammar, explaining your reasoning.

2. Vocabulary (out of 10):

    - Evaluate the range and appropriateness of the vocabulary used.
    - Consider the variety, accuracy, and appropriateness of word choices, collocations, and expressions.
    - Provide a score out of 10 for vocabulary, explaining your reasoning.

3. Feedback:

    - Provide detailed feedback on both grammar and vocabulary.
    - For grammar, point out any common errors or areas that need improvement, and provide suggestions for improvement.
    - For vocabulary, highlight any repetitive or basic word choices, and recommend more advanced or varied expressions that could enhance the response.

Topic : {topic}    

Transcript:
{transcript} """

# EvaluationResult is a class that represents the result of an evaluation.
class EvaluationResult(BaseModel):
    grammer_score: int = Field(..., description="Score for grammar")
    vocabulary_score: int = Field(..., description="Score for vocabulary")
    feedback: str = Field(..., description="Feedback on the evaluation")



class Evaluator:
    def __init__(self):
        self.llm = ChatOllama(
            model = "llama3.1",
            temperature = 0,
            num_predict = 256,
            format = "json",
        )
        self.llm = self.llm.with_structured_output(EvaluationResult)

    def evaluate(self, topic, transcript: str) -> EvaluationResult:
        prompt_template = PromptTemplate.from_template(IELTS_EVALUATION_PROMPT)
        prompt = prompt_template.invoke({"transcript": transcript, "topic": topic})
        evaluationResult = self.llm.invoke(prompt)
        return evaluationResult