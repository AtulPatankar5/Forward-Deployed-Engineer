package org.fde.geniai.aiTools;

import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

@Component
public class CalculatorTool {

    @Tool(description = "Performs Arithmetic operation for 2 numbers")
    public double calculate(
            @ToolParam(description = "Operation: add, subtract, multiply,power, mod, divide")
            String operation,
            @ToolParam(description = "Number 1")
            double a,
            @ToolParam(description = "Number 2")
            double b) {

        System.out.println("inside Calculator Spring tool app");
        if (operation.equals("+") || operation.equals("add")) {
            return a + b;
        } else if (operation.equals("-") || operation.equals("subtract")) {
            return a - b;
        } else if (operation.equals("*") || operation.equals("multiply")) {
            return a * b;
        } else if (operation.equals("/") || operation.equals("divide")) {
            if (b == 0)
                throw new IllegalArgumentException("Cannot divide by Zero");
            return a / b;
        } else if (operation.equals("power")) {
            return Math.pow(a, b);
        } else if (operation.equals("|") || operation.equals("mod")) {
            if (b == 0)
                throw new IllegalArgumentException("Cannot mod by Zero");
        } else {
            throw new IllegalArgumentException("Unsupported operation:  " + operation);
        }
        return 0;
    }
}
