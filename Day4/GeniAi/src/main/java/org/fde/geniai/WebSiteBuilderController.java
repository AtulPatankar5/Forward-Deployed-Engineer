package org.fde.geniai;

import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/website")
public class WebSiteBuilderController {

    private final WebsiteBuilderService websiteService;

    public WebSiteBuilderController(WebsiteBuilderService websiteBuilderService) {
        this.websiteService = websiteBuilderService;
    }

    @RequestMapping
    public String generateWebsite(@RequestBody String message) {
        return websiteService.generate(message);
    }


}
