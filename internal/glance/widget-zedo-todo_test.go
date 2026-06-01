package glance

import (
	"strings"
	"testing"
)

func TestZedoTodoWidgetRequiresAPIKey(t *testing.T) {
	widget := &zedoTodoWidget{}

	if err := widget.initialize(); err == nil {
		t.Fatal("expected missing api-key error")
	}
}

func TestZedoTodoWidgetInitializesDefaults(t *testing.T) {
	widget := &zedoTodoWidget{
		APIKey:  "  zedo_live_public_secret  ",
		BaseURL: zedoTodoDefaultBaseURL + "/",
		Limit:   1500,
	}

	if err := widget.initialize(); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	if widget.APIKey != "zedo_live_public_secret" {
		t.Fatalf("expected trimmed api key, got %q", widget.APIKey)
	}
	if widget.BaseURL != zedoTodoDefaultBaseURL {
		t.Fatalf("expected normalized base url, got %q", widget.BaseURL)
	}
	if widget.Limit != zedoTodoMaximumLimit {
		t.Fatalf("expected capped limit %d, got %d", zedoTodoMaximumLimit, widget.Limit)
	}
	if widget.Language != zedoTodoDefaultLanguage {
		t.Fatalf("expected default language %q, got %q", zedoTodoDefaultLanguage, widget.Language)
	}
	if !widget.ContentAvailable {
		t.Fatal("expected content to be available")
	}
}

func TestZedoTodoWidgetRejectsInvalidLanguage(t *testing.T) {
	widget := &zedoTodoWidget{
		APIKey:   "zedo_live_public_secret",
		Language: "fr",
	}

	if err := widget.initialize(); err == nil {
		t.Fatal("expected invalid language error")
	}
}

func TestZedoTodoWidgetRendersEscapedDOMData(t *testing.T) {
	widget := &zedoTodoWidget{
		widgetBase: widgetBase{Type: "zedo-todo"},
		APIKey:     `zedo_live_public_"<>&`,
		Limit:      25,
		Language:   "en",
	}
	widget.setID(42)

	if err := widget.initialize(); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	rendered := string(widget.Render())
	if !strings.Contains(rendered, `class="zedo-todo"`) {
		t.Fatalf("expected zedo todo element, got %s", rendered)
	}
	if !strings.Contains(rendered, `data-api-key="zedo_live_public_&#34;&lt;&gt;&amp;"`) {
		t.Fatalf("expected escaped api key, got %s", rendered)
	}
	if !strings.Contains(rendered, `data-base-url="`+zedoTodoDefaultBaseURL+`"`) {
		t.Fatalf("expected default base url, got %s", rendered)
	}
	if !strings.Contains(rendered, `data-limit="25"`) {
		t.Fatalf("expected configured limit, got %s", rendered)
	}
	if !strings.Contains(rendered, `data-language="en"`) {
		t.Fatalf("expected configured language, got %s", rendered)
	}
}

func TestNewWidgetSupportsZedoTodo(t *testing.T) {
	widget, err := newWidget("zedo-todo")
	if err != nil {
		t.Fatalf("new widget: %v", err)
	}

	if _, ok := widget.(*zedoTodoWidget); !ok {
		t.Fatalf("expected zedoTodoWidget, got %T", widget)
	}
}
