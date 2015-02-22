(function(w, $){

    var templates = {
        YesNoButton: _.template($('#yes_no_input').html()),
        input: _.template($('#default_input').html()),
        unqualified_person: _.template($('#unqualified_person').html()),
        qualified_person: _.template($('#qualified_person').html())

    };

    function QuestionController(questions, non_question_responses, options) {
        if (typeof options === null) {
            options = {};
        }
        this.options = _.defaults(options, {
            render_div: "#question_field"
        });
        this.questions = questions;
        this.non_question_responses = non_question_responses;
        this.answers = {};
        this.index = 0;
        this.history = [];
        this.failed = false;
        this.is_complete = false;
        this.questions_count = questions.length;
    }

    QuestionController.prototype.is_survey_failed = function(){
        return this.failed;
    };

    QuestionController.prototype.get_question = function (name) {
        return _.findWhere(this.questions, {name: name});
    };

    QuestionController.prototype.index_of_question = function (question) {
        if (typeof question == 'string') {
            question = this.get_question(question);
        }
        return _.indexOf(this.questions, question);
    };

    QuestionController.prototype.navigate = function (current_question) {
        // get either the next question when succesfully validated
        // or the actual next step

       if(!this.is_survey_failed()) {
           this.history.push(current_question.name);
           next_question_name = current_question.next;
           this.index = this.index_of_question(next_question_name);
       }
    };

    QuestionController.prototype.back = function () {
        previous_question = this.history.pop();
        if (previous_question) {
            this.failed = false;
            this.is_complete = false;
            this.index = this.index_of_question(previous_question);
            this.update_progress();
            this.render();
        }
    };

    QuestionController.prototype.get_current = function () {
        /*This section could grow to include other responses or could go away.*/
        if(this.failed)
        {
            return _.findWhere(this.non_question_responses, {name: 'unqualified_person'});
        }
        if(this.is_complete)
            return _.findWhere(this.non_question_responses, {name: 'qualified_person'});

        return this.questions[this.index];
    };

    QuestionController.prototype.store_value = function (name, value) {
        this.answers[name] = value;
        return this;
    };

    QuestionController.prototype.get_value = function (name) {
        try {
            return this.answers[name];
        } catch(e){
            return none;
        }
    };

    QuestionController.prototype.process_template = function(current_question) {
        this.navigate(current_question);
        this.update_progress();
        this.render();
    };

    QuestionController.prototype.create_template = function(template_type, context_object) {
        var template = templates[template_type];
        return $(template(context_object));
    };

    QuestionController.prototype.evaluate_eligibility = function()
    {
        this.is_complete = true;
        this.failed = !findEligibilityForSNAPWithAnswers(this.answers);
        this.update_progress();
        this.render();
    };

    QuestionController.prototype.update_progress = function()
    {
        var percentDone = ((this.index) / this.questions_count) * 100;
        if(this.is_complete || this.failed)
            percentDone = 100;

        $("#progress_bar_element").css('width', percentDone + '%' );
    };

    QuestionController.prototype.configure_template = function(current_component, target_template)
    {
        controller = this;

        switch (current_component.template_type)
        {
            case 'YesNoButton':
                target_template.on('click', '.action', function(e){
                    e.preventDefault();
                    if(current_component.unexpected_answer_is_failure) {
                        var correct_answer_button_type = current_component.expected_answer + '-btn';
                        controller.failed = !$(e.currentTarget).hasClass(correct_answer_button_type);
                    }
                    if(current_component.expected_answer == 'yes') {
                        current_component.next = current_component.next_pass;
                    } else {
                        current_component.next = current_component.next_fail;
                    }

                    controller.store_value(current_component.name, !controller.failed);
                    controller.process_template(current_component);

                    return false;
                });
                break;
            case 'input':
                current_component.next = current_component.next_pass;
                var val = target_template.find('.input_value');
                var val_el = val[0];

                var submit_field = _.debounce(function(e) {
                    e.preventDefault();
                    if (val_el.checkValidity && !val_el.checkValidity()) {
                        // html5 validate, if a special type is specified
                        // TODO: Put an alert
                        alert('Please enter a valid value.');
                        return false;
                    }
                    input_value = val.val();
                    if (current_component.input_type == 'number') {
                        input_value = parseInt(input_value);
                    }
                    controller.store_value(current_component.name, input_value);
                    if(current_component.next_pass =='evaluate_eligibility') {
                        controller.evaluate_eligibility();
                    } else {
                        controller.process_template(current_component);
                    }
                    return false;
                }, 200);

                val.keypress(function(e) {
                    if(e.which == 13) {
                        return submit_field(e);
                    }
                });

                target_template.on('click', '.btn-next', function(e){
                    return submit_field(e);
                });

                break;
        }
    };

    QuestionController.prototype.render_current = function () {
        var self, current, current_value;
        self = this;
        current = this.get_current();
        current_value = this.get_value(current.name);

        context = _.defaults(current, {
            input_type: 'text',
            value: current_value
        });

        var template = this.create_template(current.template_type, context);
        this.configure_template(current, template);

        return template;
    };

    QuestionController.prototype.render = function () {
        $(this.options.render_div).html(this.render_current());
    };

    var region = null;

    function start_questions(region){
        // load and start up questions handler
        $.getJSON('./js/configuration/' + region + '_questions.json').done(function(resp) {
            w.questions = new QuestionController(resp.questions, resp.non_question_responses, {});
            w.questions.render();
            region = resp.region;
            // Show back button
            $('#back_button_container').show().on('click', '#back_button', function(e) {
                e.preventDefault();
                w.questions.back();
            });
        }).fail(function(resp, textStatus, error) {
            console.error("failed to get questions JSON" + error);
        });
    }

    function Sections(options){
        this.sections = options.sections;
        this.callbacks = options.callbacks;
        this.index = 0;
    }

    Sections.prototype.next_section = function(){
        var current_section_id = this.sections[this.index];
        var current_section = $(current_section_id);
        this.index++;
        var next_section_id = this.sections[this.index];
        var next_section = $(next_section_id);
        if (typeof this.callbacks[next_section_id] == 'function') {
           this.callbacks[next_section_id].call(this, current_section, next_section);
        }
        current_section.slideUp(500);
        next_section.slideDown(500);
    };

    Sections.prototype.setup_button_handler = function(){
        self = this;
        $(document).on('click', '.next-section', function(e) {
            e.preventDefault();
            self.next_section();
            return false;
        });
    };

    $(function() {
        w.sections = new Sections({
            "sections": [
                "#qualify_section",
                "#initial_information_section",
				"#initial_information_section2",
                "#question_section",
            ],
            "callbacks": {
                "#question_section": function() {
                    start_questions('tulsa');
                }
            }
        });
        w.sections.setup_button_handler();
    });

})(window, jQuery);
