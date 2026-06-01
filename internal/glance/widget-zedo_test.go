package glance

import (
	"strings"
	"testing"
)

func TestZedoWidgetRequiresAPIKey(t *testing.T) {
	widget := newZedoWidget("tasks")

	if err := widget.initialize(); err == nil {
		t.Fatal("expected missing api-key error")
	}
}

func TestZedoWidgetInitializesDefaults(t *testing.T) {
	widget := newZedoWidget("tasks")
	widget.APIKey = "  zedo_live_public_secret  "
	widget.BaseURL = zedoDefaultBaseURL + "/"
	widget.Limit = 1500

	if err := widget.initialize(); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	if widget.APIKey != "zedo_live_public_secret" {
		t.Fatalf("expected trimmed api key, got %q", widget.APIKey)
	}
	if widget.BaseURL != zedoDefaultBaseURL {
		t.Fatalf("expected normalized base url, got %q", widget.BaseURL)
	}
	if widget.Limit != zedoMaximumLimit {
		t.Fatalf("expected capped limit %d, got %d", zedoMaximumLimit, widget.Limit)
	}
	if widget.Language != zedoDefaultLanguage {
		t.Fatalf("expected default language %q, got %q", zedoDefaultLanguage, widget.Language)
	}
	if widget.Mode != "daily" {
		t.Fatalf("expected default mode daily, got %q", widget.Mode)
	}
	if !widget.ContentAvailable {
		t.Fatal("expected content to be available")
	}
}

func TestZedoWidgetRejectsInvalidLanguage(t *testing.T) {
	widget := newZedoWidget("tasks")
	widget.APIKey = "zedo_live_public_secret"
	widget.Language = "fr"

	if err := widget.initialize(); err == nil {
		t.Fatal("expected invalid language error")
	}
}

func TestZedoWidgetRejectsInvalidMode(t *testing.T) {
	widget := newZedoWidget("review")
	widget.APIKey = "zedo_live_public_secret"
	widget.Mode = "monthly"

	if err := widget.initialize(); err == nil {
		t.Fatal("expected invalid mode error")
	}
}

func TestZedoWidgetRendersEscapedDOMData(t *testing.T) {
	widget := newZedoWidget("tasks")
	widget.widgetBase = widgetBase{Type: "zedo-tasks"}
	widget.APIKey = `zedo_live_public_"<>&`
	widget.Limit = 25
	widget.Language = "en"
	widget.Sections = []string{"tasks", "bogus", "memory", "tasks"}
	widget.Collections = []string{"tasks", "habits"}
	widget.setID(42)

	if err := widget.initialize(); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	rendered := string(widget.Render())
	if !strings.Contains(rendered, `class="zedo zedo-tasks"`) {
		t.Fatalf("expected zedo tasks element, got %s", rendered)
	}
	if !strings.Contains(rendered, `data-zedo-widget`) {
		t.Fatalf("expected zedo widget marker, got %s", rendered)
	}
	if !strings.Contains(rendered, `data-api-key="zedo_live_public_&#34;&lt;&gt;&amp;"`) {
		t.Fatalf("expected escaped api key, got %s", rendered)
	}
	if !strings.Contains(rendered, `data-base-url="`+zedoDefaultBaseURL+`"`) {
		t.Fatalf("expected default base url, got %s", rendered)
	}
	if !strings.Contains(rendered, `data-limit="25"`) {
		t.Fatalf("expected configured limit, got %s", rendered)
	}
	if !strings.Contains(rendered, `data-language="en"`) {
		t.Fatalf("expected configured language, got %s", rendered)
	}
	if !strings.Contains(rendered, `data-sections="tasks,memory"`) {
		t.Fatalf("expected normalized sections, got %s", rendered)
	}
	if !strings.Contains(rendered, `data-collections="tasks,habits"`) {
		t.Fatalf("expected configured collections, got %s", rendered)
	}
}

func TestNewWidgetSupportsAllZedoWidgets(t *testing.T) {
	widgetTypes := []string{
		"zedo-today",
		"zedo-tasks",
		"zedo-categories",
		"zedo-memory",
		"zedo-habits",
		"zedo-focus",
		"zedo-anniversaries",
		"zedo-stats",
		"zedo-review",
		"zedo-schedule",
		"zedo-todo",
	}

	for _, widgetType := range widgetTypes {
		widget, err := newWidget(widgetType)
		if err != nil {
			t.Fatalf("new widget %s: %v", widgetType, err)
		}

		if _, ok := widget.(*zedoWidget); !ok {
			t.Fatalf("expected zedoWidget for %s, got %T", widgetType, widget)
		}
	}
}

func TestZedoScheduleDefaultsToScheduleCollections(t *testing.T) {
	widget := newZedoWidget("schedule")
	widget.APIKey = "zedo_live_public_secret"

	if err := widget.initialize(); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	if widget.CollectionsCSV() != "tasks,memory,habits" {
		t.Fatalf("expected schedule collections, got %q", widget.CollectionsCSV())
	}
}
