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
            render_div: "#question_field",
            back_button: "#back_btn"
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

    QuestionController.prototype.navigate = function (current_question) {
        // get either the next question when succesfully validated
        // or the actual next step
       if(!this.is_survey_failed()) {
           next_view_name = current_question.next;
           this.index = _.indexOf(this.questions, this.get_question(next_view_name));
       }
    };


    QuestionController.prototype.get_current = function () {
        /*This section could grow to include other responses or could go away.*/
        if(this.failed)
        {
            return _.findWhere(this.non_question_responses, {name: 'unqualified_person'});
        }
        if(this.is_complete)
            return _.findWhere(this.non_question_responses, {name:'qualified_person'});

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

    QuestionController.prototype.process_template = function(current_question, store_value)
    {
        this.store_value(current_question.name, store_value);
        this.navigate(current_question);
        this.update_progress();
        this.render();
    };

    QuestionController.prototype.create_template = function(template_type, context_object){
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
        /*The Idea here is to be able to configure each template based upon the question's configuration and not just the template.
        * So if we have a YesNoButton and the expected answer is yes, then the class of the clicked button must be yes-btn
        * This same scenario will work for other groups of buttons (Yes, No, Maybe) as long as the classes on the buttons in the template
        * stay in sync.
        *
        * In my opinon the current questions.json file is more appropriate for a dynamic survey, but that is just my opinion*/

        controller = this;

        switch (current_component.template_type)
        {
            case 'YesNoButton':
                target_template.on('click', '.action', function(e){
                    e.preventDefault();
                    if(current_component.unexpected_answer_is_failure)
                    {
                        var correct_answer_button_type = current_component.expected_answer + '-btn';
                        controller.failed = !$(e.currentTarget).hasClass(correct_answer_button_type);
                    }
                    if(current_component.expected_answer == 'yes')
                    {
                        current_component.next = current_component.next_pass;
                    }
                    else
                    {
                        current_component.next = current_component.next_fail;
                    }
                    controller.process_template(current_component, !controller.failed);

                    return false;
                });
                break;
            case 'input':
                current_component.next = current_component.next_pass;
                // TODO: make dry
                if(current_component.next_pass =='evaluate_eligibility')
                {
                    target_template.on('click', '.btn-next', function(e){
                        e.preventDefault();
                        var val = target_template.find('.input_value');
                        val_el = val[0];
                        if (val_el.checkValidity && !val_el.checkValidity()) {
                            // html5 validate, if a special type is specified
                            // TODO: Put an alert
                            return false;
                        }
                        controller.evaluate_eligibility();
                        return false;
                    });
                }
                else {
                    target_template.on('click', '.btn-next', function (e) {
                        e.preventDefault();
                        var val = target_template.find('.input_value');
                        val_el = val[0];
                        if (val_el.checkValidity && !val_el.checkValidity()) {
                            // html5 validate, if a special type is specified
                            // TODO: Put an alert
                            return false;
                        }
                        controller.process_template(current_component, val.val());
                        return false;
                    });
                }
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
        $.getJSON('../configuration/' + region + '_questions.json').done(function(resp) {
            w.questions = new QuestionController(resp.questions, resp.non_question_responses, {});
            w.questions.render();
            region = resp.region;
        }).fail(function(resp, textStatus, error) {
            console.error("failed to get questions JSON" + error);
        });
    }

    $(function() {
        start_questions('tulsa');
    });

})(window, jQuery);
