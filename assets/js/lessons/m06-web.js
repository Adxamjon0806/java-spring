COURSE.addModule({
  id: 'm6',
  title: 'REST API на Spring Web',
  description: 'Контроллеры вместо Express-роутов, DTO и валидация вместо zod, глобальная обработка ошибок, слоистая архитектура, фильтры, CORS и HTTP-клиент.',
  lessons: [
    {
      id: 'rest-controllers',
      title: 'REST-контроллеры',
      minutes: 40,
      goals: [
        'объявлять эндпоинты через <code>@RestController</code> и <code>@GetMapping</code>/<code>@PostMapping</code>…',
        'получать параметры пути, query, тело запроса и заголовки',
        'управлять статус-кодами через <code>ResponseEntity</code> и <code>@ResponseStatus</code>',
        'написать CRUD API в памяти'
      ],
      body: `
<h2>Express-роутер и Spring-контроллер</h2>
${cmp(js`
const router = express.Router();

router.get("/", (req, res) => {
  res.json(tasks);
});

router.get("/:id", (req, res) => {
  const task = tasks.find(t => t.id === +req.params.id);
  if (!task) return res.sendStatus(404);
  res.json(task);
});

router.post("/", (req, res) => {
  const task = { id: nextId++, ...req.body };
  tasks.push(task);
  res.status(201).json(task);
});

app.use(express.json());
app.use("/api/tasks", router);`, java`
@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    @GetMapping
    public List<Task> list() {
        return tasks;
    }

    @GetMapping("/{id}")
    public ResponseEntity<Task> get(@PathVariable long id) {
        return findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Task create(@RequestBody CreateTaskRequest req) {
        Task task = new Task(nextId++, req.title(), false);
        tasks.add(task);
        return task;
    }
}`, 'Express', 'Spring')}
<ul>
  <li><dfn>@RestController</dfn> = <code>@Controller</code> + <code>@ResponseBody</code>: возвращаемое значение метода сериализуется в JSON (библиотекой <dfn>Jackson</dfn>). Никакого <code>res.json()</code> — просто <code>return</code>.</li>
  <li><code>@RequestMapping("/api/tasks")</code> на классе — общий префикс, как <code>app.use("/api/tasks", router)</code>.</li>
  <li>Тело запроса парсится в объект автоматически (<code>express.json()</code> не нужен), а <b>типы проверяются</b>: если в <code>id</code> пути передать <code>abc</code> — Spring сам вернёт 400.</li>
  <li>Контроллер — обычный бин-синглтон (смотри предупреждение о состоянии ниже).</li>
</ul>

<h2>Маппинг HTTP-методов</h2>
${table(['Express', 'Spring'], [
  ['<code>router.get(path)</code>', '<code>@GetMapping(path)</code>'],
  ['<code>router.post(path)</code>', '<code>@PostMapping(path)</code>'],
  ['<code>router.put(path)</code>', '<code>@PutMapping(path)</code>'],
  ['<code>router.patch(path)</code>', '<code>@PatchMapping(path)</code>'],
  ['<code>router.delete(path)</code>', '<code>@DeleteMapping(path)</code>']
])}

<h2>Откуда брать данные запроса</h2>
${table(['Express', 'Spring', 'Пример'], [
  ['<code>req.params.id</code>', '<code>@PathVariable</code>', '<code>@GetMapping("/{id}") get(@PathVariable long id)</code>'],
  ['<code>req.query.page</code>', '<code>@RequestParam</code>', '<code>@RequestParam(defaultValue = "0") int page</code>'],
  ['<code>req.query.q</code> (необязательный)', '<code>@RequestParam(required = false)</code>', '<code>@RequestParam(required = false) String q</code>'],
  ['<code>req.body</code>', '<code>@RequestBody</code>', '<code>@RequestBody CreateTaskRequest req</code>'],
  ['<code>req.headers["x-request-id"]</code>', '<code>@RequestHeader</code>', '<code>@RequestHeader("X-Request-Id") String rid</code>'],
  ['<code>req.cookies.session</code>', '<code>@CookieValue</code>', '<code>@CookieValue("session") String s</code>']
])}
${java`
// GET /api/tasks/search?q=молоко&done=false&page=0&size=20
@GetMapping("/search")
public List<Task> search(
        @RequestParam String q,                               // обязательный: нет — 400
        @RequestParam(required = false) Boolean done,         // необязательный: null
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size) {
    ...
}`}
${info(`<p>Spring берёт имена параметров (<code>id</code>, <code>q</code>) из имён аргументов метода. Это работает, потому что <code>spring-boot-starter-parent</code> компилирует с флагом <code>-parameters</code>. Если увидишь ошибку про отсутствие имени параметра — укажи его явно: <code>@PathVariable("id")</code>.</p>`)}

<h2>Тело запроса и ответа: Jackson</h2>
<p>Jackson превращает JSON ↔ Java-объекты. Records подходят идеально:</p>
${java`
public record CreateTaskRequest(String title, String description) {}
public record Task(long id, String title, boolean done) {}`}
${json`
POST /api/tasks
{ "title": "Купить молоко", "description": "2 литра" }

200 OK
{ "id": 1, "title": "Купить молоко", "done": false }`}
<ul>
  <li>Неизвестные поля в JSON по умолчанию игнорируются (Spring Boot так настраивает Jackson).</li>
  <li>Отсутствующие поля становятся <code>null</code> (или 0/false для примитивов).</li>
  <li>Даты (<code>Instant</code>, <code>LocalDate</code>) сериализуются в строки ISO-8601.</li>
  <li>Переименовать поле в JSON: <code>@JsonProperty("due_date") LocalDate dueDate</code>. Глобально snake_case: <code>spring.jackson.property-naming-strategy: SNAKE_CASE</code>.</li>
</ul>

<h2>Статус-коды</h2>
${java`
// 1. По умолчанию — 200 OK
@GetMapping("/{id}")
public Task get(@PathVariable long id) { ... }

// 2. Фиксированный статус
@PostMapping
@ResponseStatus(HttpStatus.CREATED)         // 201
public Task create(@RequestBody CreateTaskRequest req) { ... }

@DeleteMapping("/{id}")
@ResponseStatus(HttpStatus.NO_CONTENT)      // 204
public void delete(@PathVariable long id) { ... }

// 3. Полный контроль: ResponseEntity — статус, заголовки, тело
@PostMapping
public ResponseEntity<Task> create(@RequestBody CreateTaskRequest req) {
    Task task = ...;
    return ResponseEntity
        .created(URI.create("/api/tasks/" + task.id()))   // 201 + Location
        .header("X-Custom", "value")
        .body(task);
}`}
${node(`<p><code>ResponseEntity</code> ≈ <code>res.status(201).set(...).json(...)</code>. А для ошибок (404, 400) в реальном проекте не возвращают <code>ResponseEntity</code> из каждого метода, а бросают исключение и обрабатывают его централизованно — это следующий урок.</p>`)}

<h2>Полный CRUD в памяти</h2>
${java`
@@ TaskController.java
package com.example.todo.task;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    // потокобезопасные структуры: контроллер — синглтон, запросы идут параллельно
    private final Map<Long, Task> tasks = new ConcurrentHashMap<>();
    private final AtomicLong sequence = new AtomicLong();

    public record Task(long id, String title, boolean done) {}
    public record CreateTaskRequest(String title) {}
    public record UpdateTaskRequest(String title, boolean done) {}

    @GetMapping
    public List<Task> list(@RequestParam(required = false) Boolean done) {
        return tasks.values().stream()
            .filter(t -> done == null || t.done() == done)
            .sorted(Comparator.comparingLong(Task::id))
            .toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Task> get(@PathVariable long id) {
        Task task = tasks.get(id);
        return task == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(task);
    }

    @PostMapping
    public ResponseEntity<Task> create(@RequestBody CreateTaskRequest req) {
        long id = sequence.incrementAndGet();
        Task task = new Task(id, req.title(), false);
        tasks.put(id, task);
        return ResponseEntity.created(URI.create("/api/tasks/" + id)).body(task);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Task> update(@PathVariable long id, @RequestBody UpdateTaskRequest req) {
        if (!tasks.containsKey(id)) return ResponseEntity.notFound().build();
        Task updated = new Task(id, req.title(), req.done());
        tasks.put(id, updated);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable long id) {
        tasks.remove(id);
    }
}`}
${warn(`<p>Хранить данные в полях контроллера мы будем только до модуля про БД. И даже здесь используется <code>ConcurrentHashMap</code> и <code>AtomicLong</code>: обычный <code>HashMap</code> и <code>long</code>-счётчик сломаются при параллельных запросах.</p>`)}

<h2>Проверяем API</h2>
${bash`
curl -i http://localhost:8080/api/tasks
curl -i -X POST http://localhost:8080/api/tasks -H "Content-Type: application/json" -d '{"title":"Купить молоко"}'
curl -i -X PUT http://localhost:8080/api/tasks/1 -H "Content-Type: application/json" -d '{"title":"Купить молоко","done":true}'
curl -i -X DELETE http://localhost:8080/api/tasks/1`}
<p>В IDEA удобнее HTTP Client: создай файл <code>requests.http</code> и запускай запросы кнопкой ▶ (аналог REST Client в VS Code):</p>
${http`
### Список задач
GET http://localhost:8080/api/tasks

### Создать задачу
POST http://localhost:8080/api/tasks
Content-Type: application/json

{ "title": "Выучить Spring" }`}
`,
      tasks: [
        {
          title: 'Notes API',
          text: `<p>Сделай контроллер <code>/api/notes</code>: заметка = <code>id</code>, <code>text</code>, <code>tags</code> (<code>List&lt;String&gt;</code>), <code>createdAt</code> (<code>Instant</code>). Эндпоинты: список с фильтром <code>?tag=...</code>, получение по id (404 если нет), создание (201 + Location), удаление (204). Проверь через <code>.http</code>-файл.</p>`,
          solution: java`
            @RestController
            @RequestMapping("/api/notes")
            public class NoteController {
                private final Map<Long, Note> notes = new ConcurrentHashMap<>();
                private final AtomicLong seq = new AtomicLong();

                public record Note(long id, String text, List<String> tags, Instant createdAt) {}
                public record CreateNoteRequest(String text, List<String> tags) {}

                @GetMapping
                public List<Note> list(@RequestParam(required = false) String tag) {
                    return notes.values().stream()
                        .filter(n -> tag == null || n.tags().contains(tag))
                        .sorted(Comparator.comparing(Note::createdAt).reversed())
                        .toList();
                }

                @GetMapping("/{id}")
                public ResponseEntity<Note> get(@PathVariable long id) {
                    return Optional.ofNullable(notes.get(id))
                        .map(ResponseEntity::ok)
                        .orElse(ResponseEntity.notFound().build());
                }

                @PostMapping
                public ResponseEntity<Note> create(@RequestBody CreateNoteRequest req) {
                    long id = seq.incrementAndGet();
                    List<String> tags = req.tags() == null ? List.of() : List.copyOf(req.tags());
                    Note note = new Note(id, req.text(), tags, Instant.now());
                    notes.put(id, note);
                    return ResponseEntity.created(URI.create("/api/notes/" + id)).body(note);
                }

                @DeleteMapping("/{id}")
                @ResponseStatus(HttpStatus.NO_CONTENT)
                public void delete(@PathVariable long id) {
                    notes.remove(id);
                }
            }`
        }
      ],
      quiz: [
        { q: 'Как получить <code>id</code> из пути <code>/users/42</code>?', options: ['@RequestParam long id', '@PathVariable long id', '@RequestBody long id', 'req.params.id'], answer: 1, explain: 'Плейсхолдер {id} в маппинге + @PathVariable.' },
        { q: 'Что вернёт Spring, если в <code>@PathVariable long id</code> пришло <code>abc</code>?', options: ['500', '400 Bad Request', '404', 'id = 0'], answer: 1, explain: 'Ошибка преобразования типа → 400 автоматически.' },
        { q: 'Чем <code>@RestController</code> отличается от <code>@Controller</code>?', options: ['Ничем', 'Возвращаемые значения сериализуются в тело ответа (JSON), а не считаются именем HTML-шаблона', 'Он быстрее', 'Он не является бином'], answer: 1, explain: '@RestController = @Controller + @ResponseBody.' },
        { q: 'Как вернуть 201 с заголовком Location?', options: ['@ResponseStatus(CREATED)', 'ResponseEntity.created(uri).body(obj)', 'return 201', 'res.status(201)'], answer: 1, explain: '@ResponseStatus задаёт только статус; для заголовков — ResponseEntity.' }
      ]
    },

    {
      id: 'dto-validation-errors',
      title: 'DTO, валидация и обработка ошибок',
      minutes: 40,
      goals: [
        'разделять DTO и доменные объекты',
        'валидировать входные данные аннотациями Bean Validation',
        'централизованно превращать исключения в HTTP-ответы через <code>@RestControllerAdvice</code>',
        'возвращать ошибки в стандартном формате ProblemDetail (RFC 9457)'
      ],
      body: `
<h2>DTO</h2>
<p><dfn>DTO</dfn> (Data Transfer Object — объект передачи данных) — класс, описывающий форму данных на границе API: что приходит в запросе и что уходит в ответе. Обычно это records.</p>
<p>Зачем отдельные классы, а не отдавать наружу доменный объект/сущность БД:</p>
<ul>
  <li><b>безопасность</b>: в ответ не утечёт <code>passwordHash</code>, а клиент не сможет прислать <code>role: "ADMIN"</code> (mass assignment);</li>
  <li><b>стабильность API</b>: можно менять структуру БД, не ломая клиентов;</li>
  <li><b>разные формы</b>: для создания нужны одни поля, для ответа — другие.</li>
</ul>
${java`
// Запросы
public record CreateUserRequest(String name, String email, String password) {}
public record UpdateUserRequest(String name) {}

// Ответ
public record UserResponse(long id, String name, String email, Instant createdAt) {
    public static UserResponse from(User user) {          // маппинг из доменной модели
        return new UserResponse(user.getId(), user.getName(), user.getEmail(), user.getCreatedAt());
    }
}`}
<p>Соглашения по именам: <code>XxxRequest</code>/<code>XxxResponse</code> или <code>XxxDto</code>. Для больших проектов маппинг генерирует библиотека <dfn>MapStruct</dfn>, но ручной статический метод <code>from</code> проще и прозрачнее.</p>

<h2>Валидация: Bean Validation</h2>
<p>Стартер <code>spring-boot-starter-validation</code> подключает <dfn>Jakarta Bean Validation</dfn> (реализация — Hibernate Validator). Правила описываются аннотациями на полях — как схема zod, только прямо на типе.</p>
${cmp(ts`
const CreateUser = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  age: z.number().int().min(18).optional(),
});

app.post("/users", (req, res) => {
  const parsed = CreateUser.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json(parsed.error);
  ...
});`, java`
public record CreateUserRequest(
    @NotBlank @Size(max = 100) String name,
    @NotBlank @Email String email,
    @NotBlank @Size(min = 8) String password,
    @Min(18) Integer age          // null допустим
) {}

@PostMapping
@ResponseStatus(HttpStatus.CREATED)
public UserResponse create(@Valid @RequestBody CreateUserRequest req) {
    // сюда попадём, только если данные валидны
    ...
}`, 'zod', 'Bean Validation')}
<p>Ключевое — <code>@Valid</code> перед <code>@RequestBody</code>. Без неё аннотации на полях игнорируются! При ошибке Spring бросает <code>MethodArgumentNotValidException</code> и возвращает 400.</p>
${table(['Аннотация', 'Проверка'], [
  ['<code>@NotNull</code>', 'не null'],
  ['<code>@NotEmpty</code>', 'не null и не пустая строка/коллекция'],
  ['<code>@NotBlank</code>', 'строка не null и не из одних пробелов — для текстовых полей'],
  ['<code>@Size(min, max)</code>', 'длина строки/размер коллекции'],
  ['<code>@Min</code>, <code>@Max</code>, <code>@Positive</code>, <code>@PositiveOrZero</code>', 'числовые границы'],
  ['<code>@Email</code>, <code>@Pattern(regexp = "...")</code>', 'формат'],
  ['<code>@Past</code>, <code>@Future</code>', 'даты'],
  ['<code>@Valid</code> на поле', 'каскадная проверка вложенного объекта или элементов списка']
])}
${java`
// Сообщение об ошибке можно задать
@NotBlank(message = "Название задачи обязательно")
String title;

// Параметры пути и query тоже можно валидировать
@GetMapping("/{id}")
public TaskResponse get(@PathVariable @Positive long id) { ... }`}
${info(`<p>Валидация на уровне DTO проверяет <b>формат</b>. Бизнес-правила («email уже занят», «нельзя закрыть чужую задачу») проверяются в сервисе и выражаются исключениями.</p>`)}

<h2>Обработка ошибок: @RestControllerAdvice</h2>
<p>В Express ты пишешь error-middleware с четырьмя аргументами, и все <code>next(err)</code> попадают туда. В Spring тот же приём — класс с <code>@RestControllerAdvice</code>, методы которого ловят исключения из всех контроллеров:</p>
${cmp(js`
class NotFoundError extends Error {}

app.get("/users/:id", async (req, res, next) => {
  const user = await repo.find(req.params.id);
  if (!user) return next(new NotFoundError("User not found"));
  res.json(user);
});

app.use((err, req, res, next) => {
  if (err instanceof NotFoundError)
    return res.status(404).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: "Internal error" });
});`, java`
@GetMapping("/{id}")
public UserResponse get(@PathVariable long id) {
    return userService.get(id);   // бросит NotFoundException
}

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    public ProblemDetail handleNotFound(NotFoundException ex) {
        return ProblemDetail.forStatusAndDetail(
            HttpStatus.NOT_FOUND, ex.getMessage());
    }
}`, 'Express', 'Spring')}

<h3>ProblemDetail — стандартный формат ошибок</h3>
<p><dfn>ProblemDetail</dfn> — реализация стандарта RFC 9457 «Problem Details for HTTP APIs» (ранее RFC 7807). Вместо самодельного <code>{ error: "..." }</code> — единый формат, который понимают многие клиенты:</p>
${json`
{
  "type": "about:blank",
  "title": "Not Found",
  "status": 404,
  "detail": "User 42 not found",
  "instance": "/api/users/42"
}`}
<p>Если своего обработчика нет, стандартный формат для встроенных ошибок Spring (400 при неверном JSON, 405 и т.д.) включается настройкой <code>spring.mvc.problemdetails.enabled: true</code>. Но обычно пишут свой обработчик — тогда его наследуют от <code>ResponseEntityExceptionHandler</code>, который делает то же самое.</p>

<h3>Полноценный обработчик</h3>
${java`
@@ GlobalExceptionHandler.java
package com.example.todo.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.util.LinkedHashMap;
import java.util.Map;

// ResponseEntityExceptionHandler уже умеет превращать стандартные ошибки Spring MVC
// (невалидный JSON, 405, 415, ошибки валидации...) в ProblemDetail с правильным статусом
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(NotFoundException.class)
    public ProblemDetail notFound(NotFoundException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(ConflictException.class)
    public ProblemDetail conflict(ConflictException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
    }

    // ошибки @Valid обрабатывает родительский класс — дополним ответ списком полей
    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex, HttpHeaders headers,
            HttpStatusCode status, WebRequest request) {
        ProblemDetail pd = ex.getBody();           // уже содержит status 400
        pd.setDetail("Validation failed");
        Map<String, String> errors = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
            .forEach(e -> errors.putIfAbsent(e.getField(), e.getDefaultMessage()));
        pd.setProperty("errors", errors);          // дополнительное поле в JSON
        return handleExceptionInternal(ex, pd, headers, status, request);
    }

    @ExceptionHandler(Exception.class)            // всё остальное — 500 без деталей наружу
    public ProblemDetail unexpected(Exception ex) {
        log.error("Unexpected error", ex);
        return ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, "Internal error");
    }
}`}
${json`
POST /api/users  { "name": "", "email": "not-an-email", "password": "123" }

400 Bad Request
{
  "type": "about:blank",
  "title": "Bad Request",
  "status": 400,
  "detail": "Validation failed",
  "instance": "/api/users",
  "errors": {
    "name": "must not be blank",
    "email": "must be a well-formed email address",
    "password": "size must be between 8 and 2147483647"
  }
}`}
${tip(`<p>Альтернатива для простых случаев — аннотировать само исключение: <code>@ResponseStatus(HttpStatus.NOT_FOUND) class NotFoundException extends RuntimeException</code>. Но централизованный обработчик гибче: формат ответа в одном месте, логирование, дополнительные поля.</p>`)}
${warn(`<p>Обработчик <code>@ExceptionHandler(Exception.class)</code> перехватит и исключения Spring Security (403/401), если они долетят до контроллера. Когда подключишь Security (модуль 8), добавь для них отдельные обработчики или следи, чтобы общий обработчик их не «съедал».</p>`)}
`,
      tasks: [
        {
          title: 'Валидация регистрации',
          text: `<p>Добавь в Notes API (или в TaskController) DTO с валидацией: <code>text</code> — не пустой, до 1000 символов; <code>tags</code> — не больше 5 элементов, каждый тег — не пустой и до 30 символов (подсказка: аннотации можно ставить на тип-параметр: <code>List&lt;@NotBlank @Size(max = 30) String&gt;</code>). Добавь <code>GlobalExceptionHandler</code> и убедись, что ответ содержит поле <code>errors</code>.</p>`,
          solution: java`
            public record CreateNoteRequest(
                @NotBlank @Size(max = 1000) String text,
                @Size(max = 5) List<@NotBlank @Size(max = 30) String> tags
            ) {}

            @PostMapping
            public ResponseEntity<Note> create(@Valid @RequestBody CreateNoteRequest req) { ... }

            // Для элементов списка getField() вернёт путь вида "tags[2]" — это удобно клиенту.`
        },
        {
          title: 'Исключения вместо ResponseEntity',
          text: `<p>Перепиши <code>get</code>/<code>update</code> в своём контроллере так, чтобы они возвращали просто DTO, а при отсутствии записи бросали <code>NotFoundException</code>. Проверь, что ответ — ProblemDetail с 404.</p>`,
          solution: java`
            public class NotFoundException extends RuntimeException {
                public NotFoundException(String message) { super(message); }
            }

            @GetMapping("/{id}")
            public Note get(@PathVariable long id) {
                Note note = notes.get(id);
                if (note == null) throw new NotFoundException("Note " + id + " not found");
                return note;
            }`
        }
      ],
      quiz: [
        { q: 'Что произойдёт, если забыть <code>@Valid</code> перед <code>@RequestBody</code>?', options: ['Ошибка компиляции', 'Аннотации валидации на полях будут проигнорированы', 'Валидация всё равно сработает', 'Spring не стартует'], answer: 1, explain: 'Именно @Valid запускает проверку объекта.' },
        { q: 'Какая аннотация отклонит строку из одних пробелов?', options: ['@NotNull', '@NotEmpty', '@NotBlank', '@Size(min=0)'], answer: 2, explain: '@NotBlank проверяет, что после удаления пробелов что-то осталось.' },
        { q: 'Аналог Express error-middleware:', options: ['@ControllerFilter', '@RestControllerAdvice + @ExceptionHandler', 'try/catch в каждом методе', 'HandlerInterceptor'], answer: 1, explain: 'Исключения из любых контроллеров попадают в методы @ExceptionHandler.' },
        { q: 'Зачем отдельный UserResponse вместо возврата сущности User?', options: ['Так быстрее', 'Чтобы не утекли лишние поля (passwordHash) и API не зависел от структуры БД', 'Jackson не умеет сериализовать сущности', 'Так требует Spring'], answer: 1, explain: 'DTO — контракт API, отделённый от внутренней модели.' }
      ]
    },

    {
      id: 'architecture',
      title: 'Архитектура: слои, фильтры, CORS, HTTP-клиент',
      minutes: 35,
      goals: [
        'разделять код на слои Controller → Service → Repository',
        'организовывать пакеты по фичам',
        'писать аналоги Express-middleware: фильтры и интерсепторы',
        'настраивать CORS и вызывать внешние API через RestClient'
      ],
      body: `
<h2>Три слоя</h2>
${flow('HTTP', 'Controller', 'Service', 'Repository', 'БД')}
${table(['Слой', 'Отвечает за', 'Не должен'], [
  ['<b>Controller</b> (<code>@RestController</code>)', 'HTTP: маршруты, разбор запроса, валидация формата, DTO, статус-коды', 'Содержать бизнес-логику, ходить в БД напрямую'],
  ['<b>Service</b> (<code>@Service</code>)', 'Бизнес-логика, правила, транзакции, оркестрация', 'Знать про HTTP (<code>HttpServletRequest</code>, <code>ResponseEntity</code>)'],
  ['<b>Repository</b> (<code>@Repository</code>)', 'Доступ к данным', 'Содержать бизнес-правила']
])}
${node(`<p>Это та же схема, что routes → controllers → services → models во многих Express-проектах. Разница в том, что в Spring её придерживаются почти всегда — это общепринятая норма, и ревьюер её ожидает.</p>`)}
${java`
@RestController
@RequestMapping("/api/tasks")
public class TaskController {
    private final TaskService taskService;

    public TaskController(TaskService taskService) { this.taskService = taskService; }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TaskResponse create(@Valid @RequestBody CreateTaskRequest req) {
        return TaskResponse.from(taskService.create(req.title(), req.dueDate()));
    }
}

@Service
public class TaskService {
    private final TaskRepository repo;
    private final AppProperties props;

    public TaskService(TaskRepository repo, AppProperties props) { ... }

    public Task create(String title, LocalDate dueDate) {
        if (repo.count() >= props.maxTasksPerUser()) {
            throw new ConflictException("Task limit reached");
        }
        return repo.save(new Task(title, dueDate));
    }
}`}
${tip(`<p>Нужен ли интерфейс для каждого сервиса (<code>TaskService</code> + <code>TaskServiceImpl</code>)? Это старая привычка. Mockito отлично мокает классы, поэтому интерфейс заводи, только когда реально есть несколько реализаций.</p>`)}

<h2>Пакеты: по слоям или по фичам</h2>
${cmp(text`
com.example.todo
├── controller/
│   ├── TaskController
│   └── UserController
├── service/
│   ├── TaskService
│   └── UserService
├── repository/
├── dto/
└── entity/`, text`
com.example.todo
├── task/
│   ├── TaskController
│   ├── TaskService
│   ├── TaskRepository
│   ├── Task
│   └── dto/ (CreateTaskRequest, TaskResponse)
├── user/
│   └── ...
├── common/  (ошибки, GlobalExceptionHandler)
└── config/  (SecurityConfig, WebConfig)`, 'По слоям', 'По фичам (рекомендуется)')}
<p><dfn>Package by feature</dfn> лучше масштабируется: всё про задачи — в одном месте, и можно делать классы package-private, скрывая внутренности фичи.</p>

<h2>Middleware → Filter и HandlerInterceptor</h2>
<p>В Spring два уровня «промежуточной обработки»:</p>
<ul>
  <li><dfn>Filter</dfn> (Servlet Filter) — работает на самом низком уровне, до Spring MVC. Ближайший аналог Express-middleware. На фильтрах построен Spring Security.</li>
  <li><dfn>HandlerInterceptor</dfn> — внутри Spring MVC, знает, какой метод контроллера будет вызван.</li>
</ul>
${cmp(js`
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    console.log(\`\${req.method} \${req.url} -> \${res.statusCode} (\${ms} ms)\`);
  });
  next();
});`, java`
@Component
public class RequestTimingFilter extends OncePerRequestFilter {
    private static final Logger log =
        LoggerFactory.getLogger(RequestTimingFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest req,
                                    HttpServletResponse res,
                                    FilterChain chain)
            throws ServletException, IOException {
        long start = System.nanoTime();
        try {
            chain.doFilter(req, res);      // = next()
        } finally {
            long ms = (System.nanoTime() - start) / 1_000_000;
            log.info("{} {} -> {} ({} ms)", req.getMethod(),
                req.getRequestURI(), res.getStatus(), ms);
        }
    }
}`, 'Express middleware', 'Spring Filter')}
<p>Фильтр-бин с <code>@Component</code> автоматически применяется ко всем запросам. Порядок задаётся аннотацией <code>@Order</code>. Если не вызвать <code>chain.doFilter</code> — запрос дальше не пойдёт (как без <code>next()</code>).</p>

<h2>CORS</h2>
<p>Если фронтенд на React (<code>localhost:5173</code>) ходит в API на <code>localhost:8080</code>, нужен <dfn>CORS</dfn> (Cross-Origin Resource Sharing). Аналог пакета <code>cors</code>:</p>
${java`
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins("http://localhost:5173")
            .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE")
            .allowedHeaders("*")
            .allowCredentials(true);
    }
}`}
${warn(`<p>Когда подключишь Spring Security, CORS нужно дополнительно включить в цепочке безопасности: <code>http.cors(Customizer.withDefaults())</code>, иначе preflight-запросы <code>OPTIONS</code> будут отклоняться до того, как дойдут до MVC.</p>`)}

<h2>Вызов внешних API: RestClient</h2>
<p>Аналог <code>fetch</code>/<code>axios</code> — <dfn>RestClient</dfn> (Spring 6.1+). Синхронный, с fluent-API и автоматическим маппингом JSON в records:</p>
${cmp(js`
const res = await fetch(
  \`https://api.github.com/users/\${login}\`,
  { headers: { Accept: "application/json" } });
if (!res.ok) throw new Error(res.status);
const user = await res.json();`, java`
record GithubUser(String login, String name, int publicRepos) {}

GithubUser user = restClient.get()
    .uri("/users/{login}", login)
    .accept(MediaType.APPLICATION_JSON)
    .retrieve()                  // 4xx/5xx -> исключение
    .body(GithubUser.class);`)}
${java`
@Configuration
public class ClientsConfig {
    @Bean
    RestClient githubClient(RestClient.Builder builder) {   // Builder настроен Boot'ом
        return builder
            .baseUrl("https://api.github.com")
            .defaultHeader("User-Agent", "todo-api")
            .build();
    }
}

@Service
public class GithubService {
    private final RestClient github;

    public GithubService(RestClient githubClient) { this.github = githubClient; }

    public GithubUser find(String login) {
        return github.get().uri("/users/{login}", login).retrieve().body(GithubUser.class);
    }

    public List<Repo> repos(String login) {
        return github.get().uri("/users/{login}/repos", login)
            .retrieve()
            .body(new ParameterizedTypeReference<List<Repo>>() {});  // generics + erasure
    }
}`}
<p>Поле <code>publicRepos</code> заполнится из <code>public_repos</code>, если включить snake_case в Jackson (<code>spring.jackson.property-naming-strategy: SNAKE_CASE</code>) или поставить <code>@JsonProperty("public_repos")</code>.</p>
`,
      tasks: [
        {
          title: 'Рефакторинг в слои',
          text: `<p>Разнеси свой in-memory TaskController на три класса в пакете <code>com.example.todo.task</code>: <code>TaskController</code> (только HTTP и DTO), <code>TaskService</code> (бизнес-правило: не больше <code>app.max-tasks-per-user</code> задач, название уникально — иначе <code>ConflictException</code> → 409) и <code>InMemoryTaskRepository</code> (хранение в <code>ConcurrentHashMap</code>, методы <code>save</code>, <code>findById</code>, <code>findAll</code>, <code>deleteById</code>, <code>existsByTitle</code>, <code>count</code>).</p>`,
          solution: java`
            @Repository
            public class InMemoryTaskRepository {
                private final Map<Long, Task> store = new ConcurrentHashMap<>();
                private final AtomicLong seq = new AtomicLong();

                public Task save(Task task) {
                    Task saved = task.id() == null ? task.withId(seq.incrementAndGet()) : task;
                    store.put(saved.id(), saved);
                    return saved;
                }
                public Optional<Task> findById(long id) { return Optional.ofNullable(store.get(id)); }
                public List<Task> findAll() { return List.copyOf(store.values()); }
                public void deleteById(long id) { store.remove(id); }
                public boolean existsByTitle(String title) {
                    return store.values().stream().anyMatch(t -> t.title().equalsIgnoreCase(title));
                }
                public long count() { return store.size(); }
            }

            public record Task(Long id, String title, boolean done) {
                public Task withId(long id) { return new Task(id, title, done); }
            }

            @Service
            public class TaskService {
                private final InMemoryTaskRepository repo;
                private final AppProperties props;

                public TaskService(InMemoryTaskRepository repo, AppProperties props) {
                    this.repo = repo;
                    this.props = props;
                }

                public Task create(String title) {
                    if (repo.count() >= props.maxTasksPerUser()) throw new ConflictException("Task limit reached");
                    if (repo.existsByTitle(title)) throw new ConflictException("Task '" + title + "' already exists");
                    return repo.save(new Task(null, title, false));
                }

                public Task get(long id) {
                    return repo.findById(id).orElseThrow(() -> new NotFoundException("Task " + id + " not found"));
                }
                // update, delete, list ...
            }

            // В GlobalExceptionHandler: @ExceptionHandler(ConflictException.class) -> 409`
        },
        {
          title: 'Фильтр X-Request-Id',
          text: `<p>Напиши фильтр, который берёт заголовок <code>X-Request-Id</code> из запроса (или генерирует <code>UUID</code>, если его нет), добавляет его в ответ и кладёт в <code>MDC</code> (<code>org.slf4j.MDC.put("requestId", id)</code>), чтобы он попадал в логи. Не забудь очистить MDC в <code>finally</code>.</p>`,
          solution: java`
            @Component
            @Order(Ordered.HIGHEST_PRECEDENCE)
            public class RequestIdFilter extends OncePerRequestFilter {
                @Override
                protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
                        throws ServletException, IOException {
                    String id = Optional.ofNullable(req.getHeader("X-Request-Id"))
                        .filter(s -> !s.isBlank())
                        .orElseGet(() -> UUID.randomUUID().toString());
                    MDC.put("requestId", id);
                    res.setHeader("X-Request-Id", id);
                    try {
                        chain.doFilter(req, res);
                    } finally {
                        MDC.remove("requestId");   // поток вернётся в пул — нельзя оставлять мусор
                    }
                }
            }

            // application.yml — показать requestId в логах:
            // logging.pattern.level: "%5p [%X{requestId}]"`
        }
      ],
      quiz: [
        { q: 'Где должна жить проверка «нельзя создать больше 100 задач»?', options: ['В контроллере', 'В сервисе', 'В DTO-аннотации', 'В репозитории'], answer: 1, explain: 'Это бизнес-правило — место в сервисном слое.' },
        { q: 'Ближайший аналог Express-middleware:', options: ['@Service', 'Servlet Filter (OncePerRequestFilter)', '@Bean', 'RestClient'], answer: 1, explain: 'Фильтр обрабатывает запрос до/после контроллера и вызывает chain.doFilter как next().' },
        { q: 'Что будет, если фильтр не вызовет <code>chain.doFilter</code>?', options: ['Spring вызовет его сам', 'Запрос не дойдёт до контроллера', 'Ошибка компиляции', 'Фильтр пропустится'], answer: 1, explain: 'Как и в Express без next(): цепочка прерывается.' },
        { q: 'Аналог fetch/axios в Spring 6.1+ для синхронного кода:', options: ['RestTemplate', 'RestClient', 'HttpServlet', 'MockMvc'], answer: 1, explain: 'RestClient — современный синхронный клиент. RestTemplate — его устаревающий предшественник, WebClient — реактивный.' }
      ]
    }
  ]
});
