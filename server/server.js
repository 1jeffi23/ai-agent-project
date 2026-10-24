import "dotenv/config";
import { llm } from "./src/models/llm.js";
import { webSearchTool } from "./src/tools/web-search.tools.js";
import { HumanMessage, ToolMessage } from "@langchain/core/messages";

const tools = [webSearchTool];

const toolsByName = Object.fromEntries(
  tools.map((tool)=>[tool.name,tool])
);

const modelWithTools = llm.bindTools(tools);

const messages = [
  new HumanMessage(
 "Find recent information about retrieval augmented generation and summarize the important developments."
),
];

while (true) {
  const aiMessage = await modelWithTools.invoke(messages);

  messages.push(aiMessage);

  if (!aiMessage.tool_calls?.length) {
    console.log("final response:", aiMessage.content);
    break;
  }

  for (const toolCall of aiMessage.tool_calls) {
    const tool = toolsByName[toolCall.name];

    if (!tool) {
      throw new Error(`Tool not found: ${toolCall.name}`);
    }

    const result = await tool.invoke(toolCall.args);

    messages.push(
      new ToolMessage({
        content: JSON.stringify(result),
        tool_call_id: toolCall.id,
      })
    );
  }
}