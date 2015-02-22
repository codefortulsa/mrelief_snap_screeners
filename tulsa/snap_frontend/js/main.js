(function(w, $){

    function View(){

    }

    var templates = {
        YesNoButton: _.template($('#yes_no_input').html()),
        input: _.template($('#default_input').html()),
        unqualified_person: _.template($('#unqualified_person').html())

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
           next_view_name = current_question.next_pass;
           this.index = _.indexOf(this.questions, this.get_question(next_view_name));
       }
    };


    QuestionController.prototype.next_question = function (current_question) {
        // get either the next question when succesfully validated
        // or the actual next step
        next_name = current_question.next || current_question.next_question_pass;
        this.index = _.indexOf(this.questions, this.get_question(next_name));
    };

    QuestionController.prototype.fail = function () {
        throw Error('wat');
    };

    QuestionController.prototype.get_current = function () {
        /*This section could grow to include other responses or could go away.*/
        if(this.failed)
            return _.findWhere(this.non_question_responses, {name: 'unqualified_person'});

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
        this.render();
    };

    QuestionController.prototype.create_template = function(template_type, context_object){
        var template = templates[template_type];
        var template_with_context = $(template(context_object));
        return template_with_context;
    };

    QuestionController.prototype.configure_template = function(controller, current_component, target_template)
    {
        /*The Idea here is to be able to configure each template based upon the question's configuration and not just the template.
        * So if we have a YesNoButton and the expected answer is yes, then the class of the clicked button must be yes-btn
        * This same scenario will work for other groups of buttons (Yes, No, Maybe) as long as the classes on the buttons in the template
        * stay in sync.
        *
        * In my opinon the current questions.json file is more appropriate for a dynamic survey, but that is just my opinion*/

        switch (current_component.template_type)
        {
            case 'YesNoButton':
                target_template.on('click', '.action', function(e){
                    e.preventDefault();
                    var correct_answer_button_type = current_component.expected_answer + '-btn';
                    controller.failed = !$(e.currentTarget).hasClass(correct_answer_button_type);
                    controller.process_template(current_component, !controller.failed);
                    return false;
                });
                break;
            case 'input':
                target_template.on('click', '.btn-next', function(e){
                    e.preventDefault();
                    var val = tmpl.find('.input_value');
                    val_el = val[0];
                    if (val_el.checkValidity && !val_el.checkValidity()) {
                        // html5 validate, if a special type is specified
                        return false;
                    }
                    self.process_template(current_component, val.val());
                    return false;
                });
                break;
        }
    }

    QuestionController.prototype.render_current = function () {
        var self, current, current_value;
        self = this;
        current = this.get_current();
        current_value = this.get_value(current.name);
        context = _.defaults({
            input_type: 'text',
            value: current_value
        }, current);

       var template = this.create_template(current.template_type, context);
        // terrible but wat
        // handle yes/no actions
        this.configure_template(self, current, template);


        return template;

    };
    QuestionController.prototype.render = function () {
        $(this.options.render_div).html(this.render_current());
    };

    var region = null;

    $(function() {
        // Start this up
        $.getJSON('../configuration/questions.json').done(function(resp) {
            w.questions = new QuestionController(resp.questions, resp.non_question_responses, {});
            w.questions.render();
            region = resp.region;
        }).fail(function(resp, textStatus, error) {
            console.error("failed to get questions JSON" + error);
        });
    });

})(window, jQuery);
