package glance

import (
	"errors"
	"fmt"
	"html/template"
	"net/url"
	"strings"
)

var zedoTodoWidgetTemplate = mustParseTemplate("zedo-todo.html", "widget-base.html")

const (
	zedoTodoDefaultBaseURL  = "https://zedo-supabase.lalaze.com/functions/v1/open-api/v1"
	zedoTodoDefaultLimit    = 100
	zedoTodoMaximumLimit    = 1000
	zedoTodoDefaultLanguage = "zh"
)

type zedoTodoWidget struct {
	widgetBase `yaml:",inline"`
	APIKey     string `yaml:"api-key"`
	BaseURL    string `yaml:"base-url"`
	Limit      int    `yaml:"limit"`
	Language   string `yaml:"language"`
}

func (widget *zedoTodoWidget) initialize() error {
	widget.withTitle("ZEDO Todo").withError(nil)

	widget.APIKey = strings.TrimSpace(widget.APIKey)
	if widget.APIKey == "" {
		return errors.New("api-key is required")
	}

	widget.BaseURL = strings.TrimSpace(widget.BaseURL)
	if widget.BaseURL == "" {
		widget.BaseURL = zedoTodoDefaultBaseURL
	}

	parsedURL, err := url.Parse(widget.BaseURL)
	if err != nil || parsedURL.Scheme == "" || parsedURL.Host == "" {
		return fmt.Errorf("invalid base-url: %s", widget.BaseURL)
	}
	widget.BaseURL = strings.TrimRight(parsedURL.String(), "/")

	if widget.Limit <= 0 {
		widget.Limit = zedoTodoDefaultLimit
	} else if widget.Limit > zedoTodoMaximumLimit {
		widget.Limit = zedoTodoMaximumLimit
	}

	widget.Language = strings.ToLower(strings.TrimSpace(widget.Language))
	if widget.Language == "" {
		widget.Language = zedoTodoDefaultLanguage
	}
	switch widget.Language {
	case "zh", "en":
	default:
		return fmt.Errorf("invalid language: %s", widget.Language)
	}

	return nil
}

func (widget *zedoTodoWidget) Render() template.HTML {
	return widget.renderTemplate(widget, zedoTodoWidgetTemplate)
}
