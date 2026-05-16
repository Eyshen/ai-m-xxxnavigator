import os
from typing import List, Optional, Dict, Any
from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage, AIMessage
from config import BASE_URL, API_KEY, MODEL_NAME

class LLMManager:
    """
    模块 1: 用于管理大模型实例、对话流与常规配置
    """
    def __init__(
        self, 
        api_key: Optional[str] = API_KEY, 
        base_url: Optional[str] = BASE_URL, 
        model_name: str = MODEL_NAME, 
        temperature: float = 0.2,
        max_tokens: Optional[int] = 100000,
        **kwargs
    ):
        # 如果传入了 api_key 和 base_url 则使用传入的值，否则尝试从环境变量读取
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.base_url = base_url or os.getenv("OPENAI_BASE_URL")

        if not self.api_key:
            raise ValueError("必须提供 API Key，可通过参数传入或设置环境变量 OPENAI_API_KEY")

        # 初始化大模型实例
        self.llm = ChatOpenAI(
            api_key=self.api_key,
            base_url=self.base_url,
            model=model_name,
            temperature=temperature,
            max_tokens=max_tokens,
            **kwargs  # 支持传入其他特定的 OpenAI 参数，如 presence_penalty 等
        )

        # 初始化对话历史记录 (用于维护上下文)
        self.chat_history: List[BaseMessage] =[]

    def get_llm(self) -> ChatOpenAI:
        """获取配置好的大模型实例，供 Agent 或其他模块调用"""
        return self.llm

    def set_system_prompt(self, system_prompt: str):
        """设置系统级指令 (System Prompt)"""
        # 如果历史记录为空，或者第一条不是 SystemMessage，则在开头插入
        if not self.chat_history or not isinstance(self.chat_history[0], SystemMessage):
            self.chat_history.insert(0, SystemMessage(content=system_prompt))
        else:
            # 否则更新已有的 System Prompt
            self.chat_history[0] = SystemMessage(content=system_prompt)

    def add_human_message(self, content: str):
        """向对话流中添加用户输入"""
        self.chat_history.append(HumanMessage(content=content))

    def add_ai_message(self, content: str):
        """向对话流中添加模型的回复"""
        self.chat_history.append(AIMessage(content=content))

    def get_chat_history(self) -> List[BaseMessage]:
        """获取当前的完整对话流"""
        return self.chat_history

    def clear_history(self, keep_system_prompt: bool = True):
        """清空对话流，通常在一轮新任务开始时调用"""
        if keep_system_prompt and self.chat_history and isinstance(self.chat_history[0], SystemMessage):
            system_msg = self.chat_history[0]
            self.chat_history = [system_msg]
        else:
            self.chat_history = []