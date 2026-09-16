package org.fde.geniai;

import org.fde.geniai.aiTools.CalculatorTool;
import org.fde.geniai.aiTools.CurrencyExchangeTool;
import org.fde.geniai.aiTools.WeatherTool;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.ArrayList;
import java.util.List;

@Service
public class ChatService {

    private ChatClient chatClient;
    private CalculatorTool calculatorTool;
    private WeatherTool weatherTool;
    private CurrencyExchangeTool currencyExchangeTool;

    private List<Message> history = new ArrayList<>();
    private static final String SYSTEM_PROMPT = """
            You are a funny Chat Bot cracking jokes
            """;
//    private static final String SYSTEM_PROMPT = """
//            You are a helpful AI assistant with access to external tools.
//
//            Follow these rules:
//            1. For arithmetic calculations, ALWAYS use the calculator tool.
//            2. For current weather, ALWAYS use the currentWeather tool.
//            3. For currency conversion or exchange rates, ALWAYS use the convertCurrency tool
//            4. You may call multiple tools when solving a multi-step request
//            5. After receiving tool results, explain the answer naturally.
//            6. Never invent current weather or exchange-rate information.
//            7. Always use calculatorTool even for trivial calculations.
//            """;

    public ChatService(ChatClient.Builder builder, CalculatorTool calculatorTool, WeatherTool weatherTool, CurrencyExchangeTool currencyExchangeTool) {

        this.chatClient = builder.build();
        this.calculatorTool = calculatorTool;
        this.weatherTool = weatherTool;
        this.currencyExchangeTool = currencyExchangeTool;
    }

    public Flux<String> chat(String message) {

//        history.add(new UserMessage(message));
//        StringBuilder fullResponse = new StringBuilder();
        Flux<String> output = chatClient.prompt().
                system(SYSTEM_PROMPT).
//                messages(history).
                user(message).
//                tools(calculatorTool, weatherTool, currencyExchangeTool). // to call tools for specific logic and not AI response
//                call(). // to get non-streamed Response
                stream().
                content();
//                doOnNext(fullResponse::append).
//                doOnComplete(() -> {
//                    history.add(new AssistantMessage(fullResponse.toString()));
//                });

//        history.add(new AssistantMessage(output));

        return output;
    }

}
