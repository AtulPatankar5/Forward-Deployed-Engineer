package org.fde.geniai;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api")
public class SummarizeController {
    @Autowired
    private SummarizeService summarizeService;

//    public SummarizeController(SummarizeService summarize) {
//        this.summarizeService = summarize;
//    }

    @PostMapping("/chat")
    public String chat(@RequestBody String message) {
        return summarizeService.chat(message);
    }
}
